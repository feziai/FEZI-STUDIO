import test from 'node:test';
import assert from 'node:assert/strict';
import {createArinaRoom} from '../core/arina-room.js';
test('typing remains visible during overlapping slow replies and returns after last reply',()=>{
 let clock=0;
 const room=createArinaRoom({secret:'typing-test-secret',now:()=>clock,videoIndex:{idle:'/arina-live/assets/video/arina-quiet-presence.mp4',typing:'/arina-live/assets/video/arina-typing-user.mp4'}});
 room.beginReply();room.beginReply();clock=20000;room.tick();
 assert.equal(room.scene().motion,'typing');
 assert.equal(room.scene().video,'/arina-live/assets/video/arina-typing-user.mp4');
 room.endReply();assert.equal(room.scene().motion,'typing');
 room.endReply();assert.equal(room.scene().motion,'idle');
});
