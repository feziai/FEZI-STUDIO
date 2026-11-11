import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createArinaRoom} from '../core/arina-room.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('natural idle video is published and original clip retained',async()=>{
  const index=JSON.parse(await readFile(path.join(base,'public/arina-live/assets/video-index.json'),'utf8'));
  assert.match(index.idle,/arina-idle-loop-8s-original\.mp4$/);
  assert.match(index['idle-original'],/arina-idle-user\.mp4$/);
  assert.match(index.typing,/arina-typing-user\.mp4$/);
  assert.equal(index.return,index.idle);
  assert.ok((await stat(path.join(base,'public',index.idle))).size>100000);
  const html=await readFile(path.join(base,'public/fezi-hub/arina.html'),'utf8');
  assert.ok(html.includes(index.idle));
});
test('chat switches from idle to typing and back',async()=>{
  const index=JSON.parse(await readFile(path.join(base,'public/arina-live/assets/video-index.json'),'utf8'));
  const room=createArinaRoom({secret:'idle-regression-secret',videoIndex:index});
  assert.equal(room.scene().video,index.idle);
  room.beginReply();assert.equal(room.scene().video,index.typing);
  room.endReply();assert.equal(room.scene().video,index.idle);
});
test('ambient music only starts after pressing its button',async()=>{
  const js=await readFile(path.join(base,'public/arina-live/assets/live.js'),'utf8');
  assert.ok(!js.includes('function startRoomMedia()'));
  assert.ok(js.includes("$('musicToggle')?.addEventListener('click'"));
  assert.ok(js.includes('video.muted=true'));
});
