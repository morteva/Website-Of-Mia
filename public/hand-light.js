/* Photo-based relief: inferred rounded surfaces, with the original photograph. */
(() => {
  const hand=document.querySelector('.site-hand-background');
  if(!hand)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const ambient=document.createElement('canvas');ambient.className='site-red-light';ambient.setAttribute('aria-hidden','true');
  const surface=document.createElement('canvas');surface.className='site-hand-light-surface';surface.setAttribute('aria-hidden','true');
  const gl=surface.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
  if(!gl)return; // Preserve the CSS photo when GPU rendering is unavailable.
  const ctx=ambient.getContext('2d');
  const vertex=`attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
  const fragment=`precision highp float;varying vec2 uv;
    uniform sampler2D photo,relief;uniform vec2 size,light,viewport;
    uniform vec3 worldX,worldY;uniform float strength,beamX,baseOpacity;
    void main(){
      vec4 original=texture2D(photo,uv),material=texture2D(relief,uv);
      vec3 normal=normalize(material.rgb*2.-1.);vec2 local=uv*size;
      vec2 screen=vec2(dot(worldX,vec3(local,1.)),dot(worldY,vec3(local,1.)));
      float radius=max(viewport.x*.24,250.);
      vec2 spread=(screen-vec2(beamX,viewport.y*.52))/vec2(radius,max(radius,viewport.y));
      float beam=1.-smoothstep(.12,1.,length(spread));
      vec3 L=normalize(vec3((light-local)/size.y,.7));
      vec3 H=normalize(L+vec3(0.,0.,1.));
      float diffuse=max(dot(normal,L),0.);
      float shine=pow(max(dot(normal,H),0.),mix(65.,14.,material.a));
      float luminance=dot(original.rgb,vec3(.2126,.7152,.0722));
      // Compress baked-in glare, retaining texture instead of amplifying its noise.
      float albedo=.18+sqrt(max(luminance,0.))*.28;
      vec3 illumination=vec3(.90,.055,.075)*(albedo*diffuse*.95+shine*.19)*strength*beam;
      vec3 base=original.rgb*original.a*baseOpacity;
      gl_FragColor=vec4(base+illumination*original.a,1.);
    }`;
  function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;}catch{return;}
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const u={};for(const name of ['photo','relief','size','light','viewport','worldX','worldY','strength','beamX','baseOpacity'])u[name]=gl.getUniformLocation(program,name);
  function texture(unit,source){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
    for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}
  function makeRelief(image){
    const map=document.createElement('canvas');map.width=1024;map.height=384;
    const m=map.getContext('2d',{willReadFrequently:true});m.drawImage(image,0,0,map.width,map.height);
    const pixels=m.getImageData(0,0,map.width,map.height),data=pixels.data,w=map.width,h=map.height;
    const distance=new Float32Array(w*h);
    // Distance from the silhouette gives a rounded cross-section to each finger.
    for(let i=0;i<distance.length;i++)distance[i]=data[i*4+3]>18?10000:0;
    const at=(x,y)=>x<0||y<0||x>=w||y>=h?0:distance[y*w+x];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;distance[i]=Math.min(distance[i],at(x-1,y)+1,at(x,y-1)+1,at(x-1,y-1)+1.414,at(x+1,y-1)+1.414);}
    for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;distance[i]=Math.min(distance[i],at(x+1,y)+1,at(x,y+1)+1,at(x+1,y+1)+1.414,at(x-1,y+1)+1.414);}
    // Soften the medial-axis seams of the inferred depth, rather than blurring
    // the photograph itself. This avoids flat triangular patches in the palm.
    const depth=new Float32Array(w*h),smooth=new Float32Array(w*h),radius=6;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let sum=0;for(let dx=-radius;dx<=radius;dx++)sum+=Math.sqrt(Math.max(0,at(x+dx,y)))*2.2;
      depth[y*w+x]=sum/(radius*2+1);
    }
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let sum=0;for(let dy=-radius;dy<=radius;dy++)sum+=depth[Math.max(0,Math.min(h-1,y+dy))*w+x];
      smooth[y*w+x]=sum/(radius*2+1);
    }
    const height=(x,y)=>smooth[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,nx=-(height(x+2,y)-height(x-2,y))*.35,ny=-(height(x,y+2)-height(x,y-2))*.35;
      const length=Math.hypot(nx,ny,1),luminance=(data[i]+data[i+1]+data[i+2])/765;
      data[i]=(nx/length*.5+.5)*255;data[i+1]=(ny/length*.5+.5)*255;data[i+2]=(1/length*.5+.5)*255;
      data[i+3]=(.22+(1-luminance)*.25)*255;
    }
    m.putImageData(pixels,0,0);return map;
  }
  let width=0,height=0,w=0,h=0,world,previous=0,ready=false,lost=false,dirty=true,wasActive=false;
  let introPhase=null;
  function resize(){
    dirty=true;
    width=innerWidth;height=innerHeight;const scale=Math.max(1,devicePixelRatio||1);
    ambient.width=Math.ceil(width*scale);ambient.height=Math.ceil(height*scale);ctx.setTransform(scale,0,0,scale,0,0);
    const style=getComputedStyle(hand);w=parseFloat(style.width);h=parseFloat(style.height);
    const limit=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),surfaceScale=Math.min(scale,limit/w,limit/h);
    surface.width=Math.ceil(w*surfaceScale);surface.height=Math.ceil(h*surfaceScale);gl.viewport(0,0,surface.width,surface.height);
    const origin=style.transformOrigin.split(' ').map(Number.parseFloat);
    world=new DOMMatrix().translate(parseFloat(style.left)+origin[0],height-parseFloat(style.bottom)-h+origin[1]).multiply(new DOMMatrix(style.transform)).translate(-origin[0],-origin[1]);
    if(introPhase===null){
      // Start the beam outside the portrait's left edge. On other pages use
      // the same main-column alignment for a consistent site-wide approach.
      const portrait=document.querySelector('.hero img');
      const content=document.querySelector('.hero-content,.shell');
      const left=(portrait||content)?.getBoundingClientRect().left||width*.15;
      const approachX=left-Math.max(width*.24,250);
      introPhase=Math.max(0,Math.min(27,(approachX/width+.3)/1.6*28));
    }
    gl.uniform2f(u.size,w,h);gl.uniform2f(u.viewport,width,height);gl.uniform3f(u.worldX,world.a,world.c,world.e);gl.uniform3f(u.worldY,world.b,world.d,world.f);
    gl.uniform1f(u.baseOpacity,parseFloat(style.getPropertyValue('--hand-base-opacity'))||.28);
  }
  function frame(now){
    if(lost)return;requestAnimationFrame(frame);if(!ready||document.hidden||now-previous<40)return;previous=now;
    // Navigation-relative welcome: the first beam starts fading in immediately,
    // finishes that pass, then returns to the 28-second sweep / 50-second rest.
    const seconds=now/1000,elapsed=seconds,phase=(Math.max(0,elapsed)+introPhase)%78;
    const active=!reduced.matches&&elapsed>=0&&phase<=28;
    if(!active&&!wasActive&&!dirty)return;
    wasActive=active;dirty=false;
    const progress=active?phase/28:0;
    const fadeProgress=Math.min(1,Math.max(0,elapsed)/4);
    const welcomeFade=fadeProgress*fadeProgress*(3-2*fadeProgress);
    const strength=active?Math.sin(Math.PI*progress)**.8*welcomeFade:0,x=width*(-.3+1.6*progress);
    ctx.clearRect(0,0,width,height);
    if(active){const radius=Math.max(width*.24,250),glow=ctx.createRadialGradient(x,height*.52,0,x,height*.52,radius);
      glow.addColorStop(0,`rgba(116,12,24,${.33*strength})`);glow.addColorStop(.38,`rgba(86,8,20,${.231*strength})`);glow.addColorStop(1,'rgba(60,0,12,0)');
      ctx.save();ctx.translate(0,height*.52);ctx.scale(1,Math.max(1,height/radius));ctx.translate(0,-height*.52);ctx.fillStyle=glow;ctx.fillRect(0,-height,width,height*3);ctx.restore();}
    const local=new DOMPoint(x,height*.52).matrixTransform(world.inverse());
    gl.uniform2f(u.light,local.x,local.y);gl.uniform1f(u.beamX,x);gl.uniform1f(u.strength,strength);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  const image=new Image();image.onload=()=>{
    if(lost)return;texture(0,image);texture(1,makeRelief(image));gl.uniform1i(u.photo,0);gl.uniform1i(u.relief,1);
    document.body.append(ambient);hand.append(surface);resize();ready=true;hand.classList.add('hand-light-ready');requestAnimationFrame(frame);
  };image.src='/gothic-hand-background.png';
  surface.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;hand.classList.remove('hand-light-ready');ambient.remove();surface.remove();});
  addEventListener('resize',()=>{if(ready)resize();},{passive:true});
  reduced.addEventListener('change',()=>{dirty=true;});
})();
