import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createArinaRoom,requestedMotion,DANCE_STYLES} from './core/arina-room.js';
const root=dirname(fileURLToPath(import.meta.url));
const idx=JSON.parse(readFileSync(join(root,'public/arina-live/assets/video-index.json'),'utf8'));
const script=readFileSync(join(root,'public/arina-live/assets/live.js'),'utf8');
const gallery=readFileSync(join(root,'public/arina-live/assets/clip-gallery.js'),'utf8');
test('all dance styles use approved seamless non-flash loop',()=>{for(const s of DANCE_STYLES)assert.equal(idx[s],'/arina-live/assets/video/arina-approved-natural-loop.mp4')});
test('original user reverse stays archived',()=>assert.equal(idx['reverse-loop-original'],'/arina-live/assets/video/arina-smooth-reverse-loop.mp4'));
test('no standing dance in gallery',()=>assert.doesNotMatch(gallery,/stand-dance/));
test('browser uses continuous video loop and radio',()=>{assert.match(script,/video\.loop=true/);assert.match(script,/selectedRadio==='calm'\)\?'fun'/)});
test('dance scene lasts one minute and uses real media',()=>{const room=createArinaRoom({secret:'local-test-secret',videoIndex:idx});const scene=room.startScene('dance-sway');assert.equal(scene.durationMs,60000);assert.equal(scene.mode,'video');assert.equal(scene.video,idx['dance-sway'])});
test('video asset present and larger than 1MB',()=>{let n=statSync(join(root,'public/arina-live/assets/video/arina-approved-natural-loop.mp4')).size;assert.ok(n>1000000)});
test('dance phrase routes to approved style',()=>assert.equal(requestedMotion('رقص آرام'), 'dance-sway'));

test('no flash references remain in the active gallery and scene labels',()=>{assert.doesNotMatch(gallery,/فلش نور|arina-approved-flash-cut-loop/);assert.doesNotMatch(script,/فلش نور/)});
