import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createArinaRoom} from '../core/arina-room.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(ROOT,'public/arina-live/assets');
const read=n=>fs.readFile(path.join(dir,n));
const fileHash=async n=>crypto.createHash('sha256').update(await read(n)).digest('hex');

test('supplied 8s and 3min sources are copied byte-for-byte, not re-encoded',async()=>{
  assert.equal(await fileHash('video/arina-idle-loop-8s-original.mp4'),'2457fbbdb3af14494abe46b437a4de434152e313c23c54d53b51b21ac0bd03ae');
  // The unedited 114MB original cannot be committed to ordinary GitHub (100MB file cap).
  const external='video/arina-three-minute-unedited.mp4';
  try {await fs.access(path.join(dir,external));assert.equal(await fileHash(external),'313667742c599fc918a4bca15a88de08a6aa48f7caa3e12bd840bc83f5fed030');}
  catch(e){if(e.code!=='ENOENT')throw e;assert.match(await fs.readFile(path.join(ROOT,'.gitignore'),'utf8'),/arina-three-minute-unedited\.mp4/);}

});
test('primary room loops 8s, keeps 3min unedited accessible, and preserves separate typing',async()=>{
  const idx=JSON.parse((await read('video-index.json')).toString());
  assert.match(idx.idle,/arina-idle-loop-8s-original\.mp4$/);
  assert.equal(idx.return,idx.idle);
  assert.match(idx['three-minute-unedited'],/arina-three-minute-unedited\.mp4$/);
  assert.match(idx.typing,/arina-typing-user\.mp4$/);
  assert.notEqual(idx.typing,idx.idle);
});
test('shared idle scene lasts continuously and occasional motion returns to it',async()=>{
  let time=0;const idx=JSON.parse((await read('video-index.json')).toString());
  const room=createArinaRoom({secret:'continuous-test-secret-strong',now:()=>time,videoIndex:idx,ambientMinMs:300000,ambientMaxMs:300000});
  const first=room.scene().id;
  time=120001;room.tick(); assert.equal(room.scene().id,first,'the 120s scene timeout should never restart idle');
  time=299999;room.tick(); assert.equal(room.scene().id,first);
  time=300001;room.tick(); assert.equal(room.scene().motion,'reading');
  time+=3000;room.tick(); assert.equal(room.scene().motion,'idle');
  room.beginReply(); assert.equal(room.scene().video,idx.typing);
  room.endReply(); assert.equal(room.scene().video,idx.idle);
});
test('radio is separate, has four source tracks, and requires interaction for sound',async()=>{
  const h=await fs.readFile(path.join(ROOT,'public/arina-live/index.html'),'utf8');
  const js=String(await read('live.js'));
  for(const key of ['calm','persian','pop','fun']){
    assert.match(h,new RegExp(`<option value="${key}"`));
  }
  assert.match(h,/id="musicToggle"/);
  assert.match(h,/id="radioStation"/);
  assert.match(h,/id="stageVideo"[^>]+muted/);
  assert.match(h,/id="arinaLongSample"[^>]+muted/);
  assert.match(js,/id===previous|requestSwitch\(id\)/);
  assert.match(js,/id='musicToggle'|\$\('musicToggle'\)\?\.addEventListener\('click'/);
  assert.doesNotMatch(js,/pointerdown[^\n]*music\.play/);
});
