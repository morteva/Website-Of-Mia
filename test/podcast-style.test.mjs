import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('all uploaded podcast titles and descriptions use the requested reusable styling',()=>{
 const html=readFileSync('public/podcast.html','utf8'),css=readFileSync('public/podcast-episodes.css','utf8');
 assert.match(html,/href="\/podcast-episodes\.css\?v=20261015b"/);
 assert.match(css,/\.voice-log-list > article > h2\s*\{\s*color: #d8b4fe;/);
 assert.match(css,/\.voice-log-list > article > p\s*\{\s*font-weight: 700;\s*font-style: italic;/);
 assert.doesNotMatch(css,/#test|test2/); // No per-title selectors: future uploads receive the same treatment.
});
test('red coming-soon line sits under Podcast and inherits its exact responsive font size',()=>{
 const html=readFileSync('public/podcast.html','utf8'),css=readFileSync('public/podcast-episodes.css','utf8');
 assert.match(html,/<h1>Podcast\.<span class="podcast-coming-soon">COMING SOON<\/span><\/h1>/);
 assert.match(css,/\.voice-logs-head h1 \.podcast-coming-soon\s*\{[^}]*display: block;[^}]*color: #ff2c4f;[^}]*font: inherit;/);
});
