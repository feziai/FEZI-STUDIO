import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createArinaRoom,SCENE_DURATIONS} from '../core/arina-room.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets='/arina-live/assets/video/';
const fileFor=(src)=>path.join(root,'public',src);

test('the natural 15-second idle and distinct 10-second typing are selected',async()=>{
  const index=JSON.parse(await fs.readFile(path.join(root,'public/arina-live/assets/video-index.json')));
  assert.equal(index.idle,assets+'arina-idle-loop-8s-original.mp4');
  assert.equal(index['idle-original'],assets+'arina-idle-user.mp4');
  assert.equal(index.return,index.idle);
  assert.equal(index.typing,assets+'arina-typing-user.mp4');
  const hash=async f=>createHash('sha256').update(await fs.readFile(fileFor(f))).digest('hex');
  assert.notEqual(await hash(index.idle),await hash(index.typing),'idle and typing video cannot be identical');
  for(const clip of Object.values(index)){
    if(clip.endsWith('/arina-three-minute-unedited.mp4')){
      try{await fs.access(fileFor(clip))}
      catch(e){if(e.code!=='ENOENT')throw e;assert.match(await fs.readFile(path.join(root,'.gitignore'),'utf8'),/arina-three-minute-unedited\.mp4/)}
    }else await fs.access(fileFor(clip));
  }

});

test('natural idle remains the default continuously instead of changing to an alternate',async()=>{
  let clock=0;
  const index=JSON.parse(await fs.readFile(path.join(root,'public/arina-live/assets/video-index.json')));
  const room=createArinaRoom({secret:'merge-test-strong-secret',now:()=>clock,videoIndex:index});
  assert.equal(room.scene().video,index.idle);
  assert.equal(room.scene().durationMs,SCENE_DURATIONS.idle);
  clock=7500;room.tick();
  assert.equal(room.scene().video,index.idle);
  room.beginReply();assert.equal(room.scene().video,index.typing);
  clock+=3000;room.endReply();
  assert.equal(room.scene().motion,'idle');
  assert.equal(room.scene().video,index.idle);
});

test('reading and thinking use the typing clip while speaking remains disabled',()=>{
  const index={idle:assets+'arina-idle-user.mp4',typing:assets+'arina-typing-blurred.mp4'};
  const room=createArinaRoom({secret:'merge-test-strong-secret',videoIndex:index});
  room.startScene('reading');assert.equal(room.scene().video,index.typing);
  room.startScene('thinking');assert.equal(room.scene().video,index.typing);
});
