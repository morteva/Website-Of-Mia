import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('all uploaded podcast titles and descriptions use the requested reusable styling',()=>{
 const html=readFileSync('public/podcast.html','utf8'),css=readFileSync('public/podcast-episodes.css','utf8');
 assert.match(html,/href="\/podcast-episodes\.css\?v=20261015a"/);
 assert.match(css,/\.voice-log-list > article > h2\s*\{\s*color: #d8b4fe;/);
 assert.match(css,/\.voice-log-list > article > p\s*\{\s*font-weight: 700;\s*font-style: italic;/);
 assert.doesNotMatch(css,/#test|test2/); // No per-title selectors: future uploads receive the same treatment.
});
