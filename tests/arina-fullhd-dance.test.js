import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DANCE_MOVES,planDance,validateVideoSpec,chooseCategory} from '../core/arina-dance-director.js';
import {createArinaRoom,requestedMotion,thresholds} from '../core/arina-room.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('minimum 40 different catalog moves, all unique and fixed camera',()=>{
 assert.ok(DANCE_MOVES.length>=40);
 assert.equal(new Set(DANCE_MOVES.map(m=>m.id)).size,DANCE_MOVES.length);
 for(const m of DANCE_MOVES){assert.equal(m.camera,'locked-tripod');assert.equal(m.source,'motion-reference-video-required')}
});
test('detect user intents for fun, fast, Persian, trend, smooth dance',()=>{
 assert.equal(chooseCategory('یه رقص فان بامزه'),'fun');
 assert.equal(chooseCategory('رقص ۶/۸ ایرانی'),'persian');
 assert.equal(chooseCategory('kpop trend'),'pop');
 assert.equal(chooseCategory('smooth slow'),'smooth');
 assert.equal(chooseCategory('energetic'),'energetic');
 assert.equal(requestedMotion('آرینا رقص فان کن'),'dance-fun');
 assert.equal(requestedMotion('آرینا رقص ترند کن'),'dance-pop');
});
test('1-2 min dance plans never have gaps, duplicates in succession or camera cuts',()=>{
 for(const category of ['fun','persian','pop','smooth','energetic']){
  for(const d of [60,120]){
   const plan=planDance({category,durationSeconds:d,seed:'test'});
   assert.equal(plan.kind,'choreography-plan-not-video');
   assert.ok(plan.segments.length>=6);
   assert.ok(plan.durationSeconds>=59.5&&plan.durationSeconds<=120.5);
   assert.equal(plan.segments[0].startSecond,0);
   for(let i=1;i<plan.segments.length;i++){
    assert.ok(Math.abs(plan.segments[i].startSecond-plan.segments[i-1].endSecond)<=0.002);
    assert.notEqual(plan.segments[i].moveId,plan.segments[i-1].moveId);
    assert.equal(plan.segments[i].camera,'fixed');
   }
  }
 }
});
test('genuine video guard rejects short/still/low-resolution clips',()=>{
 assert.deepEqual(validateVideoSpec({width:1920,height:1080,fps:30,duration:60}),{ok:true});
 assert.equal(validateVideoSpec({width:640,height:360,fps:30,duration:60}).ok,false);
 assert.equal(validateVideoSpec({width:1920,height:1080,fps:5,duration:60}).ok,false);
 assert.equal(validateVideoSpec({width:1920,height:1080,fps:30,duration:15}).ok,false);
});
test('video-absent scene must never pretend a storyboard slideshow is moving video',()=>{
 let t=1000;const room=createArinaRoom({secret:'1234567890abcdefgh',now:()=>t,videoIndex:{}});
 room.ensure();const answer=room.requestMotion('dance-fun','abc');
 assert.equal(answer.kind,'video-unavailable');assert.equal(room.scene().mode,'portrait');
 room.startScene('happy');assert.equal(room.scene().mode,'portrait');
 t=5500;room.tick();assert.equal(room.scene().motion,'idle');
});
test('published video makes ONE server-timed scene for all viewers',()=>{
 let t=1000;const room=createArinaRoom({secret:'secret-adequate-for-tests',now:()=>t,videoIndex:{'dance-fun':'/arina-live/assets/video/arina-approved-natural-loop.mp4'}});
 const s=room.ensure();const ans=room.requestMotion('dance-fun',s.id);
 assert.equal(ans.kind,'started');assert.equal(room.scene().mode,'video');assert.equal(room.scene().durationMs,60000);
 const snap=room.snapshot();assert.equal(snap.scene.id,room.scene().id);assert.equal(snap.scene.startedAt,1000);
 t=60999;room.tick();assert.equal(room.scene().motion,'dance-fun');
 t=61001;room.tick();assert.equal(room.scene().motion,'idle');
});
test('other 3 avatars are not assigned stream video',async()=>{
 const content=await fs.readFile(path.join(root,'public/arina-live/index.html'),'utf8');
 assert.match(content,/FEZI AGENT/);assert.match(content,/ARINA/);
 assert.doesNotMatch(content,/speechSynthesis/);
 const js=await fs.readFile(path.join(root,'public/arina-live/assets/live.js'),'utf8');
 assert.doesNotMatch(js,/showImage\(frameFor\(/);
 assert.match(js,/video.*play\(/s);
 assert.doesNotMatch(js,/random.*sequences.*frames/s);
});
test('original music is real MP3 files, not broken filename',async()=>{
 for(const name of ['arina-persian-original-108bpm','arina-fun-original-120bpm','arina-pop-original-128bpm','arina-calm-original-92bpm']){
  const file=await fs.readFile(path.join(root,`public/arina-live/assets/audio/${name}.mp3`));
  assert.ok(file.length>10000);assert.ok(file.subarray(0,3).toString()==='ID3'||file[0]===0xff);
 }
});
test('all uploaded reference boards retained unmodified',async()=>{
 for(const id of ['1000266639','1000266641','1000266642','1000266643','1000266644','1000266645','1000266646','1000266647','1000266648','1000266649']){
  const file=await fs.stat(path.join(root,'references/arina/fun-dance-batch-2026-11-01',id+'.png'));
  assert.ok(file.size>100000);
 }
});
