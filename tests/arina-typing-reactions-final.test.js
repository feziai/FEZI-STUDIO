import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createArinaRoom,typingStyleForMessage} from '../core/arina-room.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=JSON.parse(fs.readFileSync(path.join(ROOT,'public/arina-live/assets/video-index.json'),'utf8'));

test('typing reactions have physical pre-recorded clips',()=>{
 for(const k of ['typing-normal','typing-frustrated','typing-soft','typing-hair']){
  assert.match(index[k],/^\/arina-live\/assets\/video\/[-\w]+\.mp4$/);
  assert.ok(fs.statSync(path.join(ROOT,'public',index[k].slice(1))).size>0);
 }
});
test('typing mood text selects existing video and retains typing scene ID',()=>{
 const room=createArinaRoom({secret:'sample-secret-with-more-than-twenty-four-characters',videoIndex:index});
 room.beginReply('واقعا امروز خیلی ناراحتم');
 assert.equal(room.scene().motion,'typing');
 assert.equal(room.scene().video,index['typing-soft']);
 room.endReply();
 room.beginReply('خیلی عصبانی ام');
 assert.equal(room.scene().video,index['typing-frustrated']);
 room.endReply();
 room.beginReply('آرینا تو چقدر خوشگلی');
 assert.equal(room.scene().video,index['typing-hair']);
 room.endReply();
 room.beginReply('سلام معمولی');
 assert.equal(room.scene().video,index['typing-normal']);
 room.endReply();
});
test('backward-compatible beginReply() uses legacy typing clip',()=>{
 const room=createArinaRoom({secret:'sample-secret-with-more-than-twenty-four-characters',videoIndex:index});
 room.beginReply();
 assert.equal(room.scene().video,index.typing);
 room.endReply();
});
test('typing short clips do not automatically replay',()=>{
 const js=fs.readFileSync(path.join(ROOT,'public/arina-live/assets/live.js'),'utf8');
 assert.match(js,/video\.loop=scene\.motion!=='typing'/);
});
