// Private control-room recorder. Audio is never published by this module.
export function mountPodcastRecorder(root, {csrf, lock, onStart, onUpload, onSaved, status}, platform = window) {
  const MAX_BYTES = 90 * 1024 * 1024; // Leave room below the existing 95 MB upload limit.
  const MAX_SECONDS = 2 * 60 * 60;
  root.innerHTML = `<h2>Record a podcast</h2>
    <p>Talk here. Stop to upload and save a private draft. Publish only when you’re ready. Existing episode audio is never replaced.</p>
    <p class="meta">Up to 2 hours or 90 MB per recording. Keep this tab open until the draft is saved.</p>
    <div class="actions"><button type="button" data-record>● Record</button><button type="button" data-pause disabled>Pause</button><button type="button" data-stop disabled>Stop & upload</button></div>
    <div class="recorder-meter"><meter data-level min="0" max="1" value="0" aria-label="Microphone level"></meter><output data-time aria-label="Recording duration">00:00</output></div>
    <p data-message role="status" aria-live="polite">Ready. Your browser will ask for microphone access.</p>
    <audio data-playback controls hidden></audio>
    <div class="actions"><button type="button" data-retry hidden>Retry upload / save</button><a data-download hidden>Download recording</a><button type="button" data-discard class="quiet" hidden>Discard local recording</button></div>`;
  const $ = key => root.querySelector('[data-' + key + ']');
  let recorder, stream, audioContext, analyser, frame, timer, chunks = [], bytes = 0;
  let active = false, pending = false, uploading = false, starting = false, dead = false;
  let startedAt = 0, elapsed = 0, file, objectUrl, asset, recordingError = '';
  const now = () => platform.performance.now();
  const seconds = () => Math.floor((elapsed + (active && recorder?.state === 'recording' ? now() - startedAt : 0)) / 1000);
  const message = text => { $('message').textContent = text; };
  function controls() {
    $('record').disabled = dead || active || starting || pending || uploading;
    $('pause').disabled = !active || !recorder || recorder.state === 'inactive';
    $('stop').disabled = !active || !recorder || recorder.state === 'inactive';
    $('pause').textContent = recorder?.state === 'paused' ? 'Resume' : 'Pause';
    $('retry').hidden = !pending || uploading;
    $('retry').disabled = uploading;
    $('discard').hidden = !pending || uploading;
    $('discard').disabled = uploading;
    $('download').hidden = !file;
  }
  function releaseMicrophone() {
    platform.clearInterval(timer);
    if (frame) platform.cancelAnimationFrame(frame);
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    stream = undefined;
    if (audioContext) void audioContext.close().catch(() => {});
    audioContext = undefined;
    $('level').value = 0;
  }
  function clearFile() {
    if (objectUrl) platform.URL.revokeObjectURL(objectUrl);
    objectUrl = undefined; file = undefined; asset = undefined; chunks = [];
    $('playback').pause(); $('playback').removeAttribute('src'); $('playback').hidden = true;
    $('download').removeAttribute('href');
  }
  function tick() {
    const s = seconds();
    $('time').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    if (s >= MAX_SECONDS) stop('Time limit reached. Uploading your recording.');
  }
  function meter() {
    if (!active || !analyser) return;
    const values = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(values);
    $('level').value = recorder.state === 'paused' ? 0 : Math.min(1, Math.sqrt(values.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / values.length) * 4);
    frame = platform.requestAnimationFrame(meter);
  }
  const mimeTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'];
  function stop(reason = 'Uploading your recording…') {
    if (!active || !recorder || recorder.state === 'inactive') return;
    if (recorder.state === 'recording') elapsed += now() - startedAt;
    active = false; message(reason); controls(); recorder.stop();
  }
  async function send() {
    if (!file || uploading || dead) return;
    uploading = true; controls();
    try {
      if (!asset) asset = await uploadRecording(file, csrf, percent => message('Uploading… ' + percent + '%'), platform);
      message('Audio uploaded. Saving your private draft…');
      await onUpload(asset, seconds());
      pending = false; lock(false); controls();
      message('Uploaded and saved as a private draft. Listen below, then use Publish when ready.');
      status('Recording saved. Nothing public changed.'); onSaved();
    } catch (error) {
      pending = true;
      message(error.message + ' Your recording is still here. Retry, or download a backup before leaving.');
      status('Recording not fully saved. Keep this tab open or download a backup.', true);
    } finally { uploading = false; controls(); }
  }
  async function start() {
    if (active || starting || pending || uploading || dead) return;
    if (!platform.isSecureContext || !platform.navigator.mediaDevices?.getUserMedia || !platform.MediaRecorder) {
      message('Microphone recording is unavailable here. Open this page in a current Chrome, Edge, Firefox or Safari browser over HTTPS. You can still upload an audio file.'); return;
    }
    const mimeType = mimeTypes.find(type => platform.MediaRecorder.isTypeSupported(type));
    if (!mimeType) { message('This browser cannot record a supported audio format. Try Chrome, Edge, Firefox or Safari.'); return; }
    starting = true; lock(true); controls(); message('Waiting for microphone permission…');
    try {
      onStart();
      stream = await platform.navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      if (dead) { releaseMicrophone(); return; }
      clearFile(); chunks = []; bytes = 0; elapsed = 0; recordingError = '';
      recorder = new platform.MediaRecorder(stream, {mimeType,audioBitsPerSecond:96000});
      recorder.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes >= MAX_BYTES) stop('Size limit reached. Uploading your recording.');
      };
      recorder.onerror = () => { recordingError = 'Recording was interrupted. Recovered audio will be uploaded if available.'; stop(recordingError); };
      recorder.onstop = async () => {
        if (active && recorder.state === 'inactive') { elapsed += now() - startedAt; active = false; }
        releaseMicrophone();
        if (dead) return;
        const type = recorder.mimeType.split(';')[0];
        const ext = type === 'audio/mp4' ? 'm4a' : type === 'audio/ogg' ? 'ogg' : 'webm';
        file = new platform.File(chunks, 'podcast-' + new Date().toISOString().replace(/[:.]/g, '-') + '.' + ext, {type});
        chunks = [];
        if (!file.size) { file = undefined; lock(false); message('No audio was captured. Check your microphone and try again.'); controls(); return; }
        objectUrl = platform.URL.createObjectURL(file);
        $('playback').src = objectUrl; $('playback').hidden = false;
        $('download').href = objectUrl; $('download').download = file.name;
        pending = true; controls(); await send();
      };
      stream.getAudioTracks().forEach(track => track.onended = () => stop('Microphone disconnected. Saving the audio captured so far.'));
      recorder.start(1000); active = true; startedAt = now();
      message('Recording. Stop will automatically upload and save a private draft.');
      timer = platform.setInterval(tick, 250);
      // Meter failures must never prevent audio capture.
      try {
        const AudioContext = platform.AudioContext || platform.webkitAudioContext;
        if (AudioContext) { audioContext = new AudioContext(); analyser = audioContext.createAnalyser(); analyser.fftSize = 256; audioContext.createMediaStreamSource(stream).connect(analyser); meter(); }
      } catch { /* Recording works without an input meter. */ }
    } catch (error) {
      releaseMicrophone(); lock(false);
      message(error.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access for morteva.com in your browser, then try again.' : error.name === 'NotFoundError' ? 'No microphone was found. Connect one, then try again.' : 'Could not start recording: ' + error.message);
    } finally { starting = false; controls(); }
  }
  $('record').onclick = start;
  $('pause').onclick = () => {
    if (!active) return;
    if (recorder.state === 'recording') { elapsed += now() - startedAt; recorder.pause(); message('Paused. Resume when ready, or Stop & upload.'); }
    else if (recorder.state === 'paused') { recorder.resume(); startedAt = now(); message('Recording resumed.'); }
    tick(); controls();
  };
  $('stop').onclick = () => stop();
  $('retry').onclick = send;
  $('discard').onclick = () => {
    if (!platform.confirm('Discard this local recording? Download a backup first if you want to keep it. Any already-uploaded original stays private in the Media Library.')) return;
    pending = false; clearFile(); lock(false); controls(); message('Local recording discarded. Nothing was published.');
  };
  const beforeUnload = event => { if (starting || active || pending || uploading) { event.preventDefault(); event.returnValue = ''; } };
  platform.addEventListener('beforeunload', beforeUnload);
  controls();
  return {destroy() { dead = true; if (recorder?.state !== 'inactive' && recorder) recorder.stop(); releaseMicrophone(); clearFile(); platform.removeEventListener('beforeunload', beforeUnload); }, start, stop};
}

export function uploadRecording(file, csrf, progress, platform = window) {
  return new Promise((resolve, reject) => {
    const xhr = new platform.XMLHttpRequest();
    xhr.open('POST', '/wmm4/api/upload'); xhr.setRequestHeader('X-CSRF-Token', csrf); xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onerror = () => reject(Error('Upload connection failed.'));
    xhr.ontimeout = () => reject(Error('Upload timed out.'));
    xhr.onabort = () => reject(Error('Upload interrupted.'));
    xhr.onload = () => {
      let data; try { data = JSON.parse(xhr.responseText); } catch { reject(Error('The server returned an unexpected response.')); return; }
      if (xhr.status < 200 || xhr.status >= 300) { reject(Error(xhr.status === 401 ? 'Your session expired. Download a backup, then sign in again.' : data.error || 'Upload failed.')); return; }
      if (!data.id || !data.url || !data.type?.startsWith('audio/') || !Number.isSafeInteger(data.size) || data.size <= 0) { reject(Error('The server did not return a valid audio upload.')); return; }
      resolve(data);
    };
    const form = new platform.FormData(); form.append('file', file); form.append('purpose', 'podcast'); xhr.send(form);
  });
}
