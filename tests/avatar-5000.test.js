import test from 'node:test';
import assert from 'node:assert/strict';
import {STATES,clamp,validateProfile,transition,smoothEnergy,mouthOpen,blinkAmount,poseAt,validateImageHeader,dialogueStatus,normalizedAmplitude} from '../public/avatar/engine.js';

// 5,000 reproducible input cases in five domain-specific families.
// Cases are arithmetic and state-contract checks, not 5,000 GPU renders.
const groups=[['pose & animation bounds',1000],['blink & state transitions',1000],['voice envelope & smoothing',1000],['lip-sync state gate',1000],['asset, profile & text validation',1000]];
for (let group=0;group<groups.length;group++) {
 test(`LIVE AVATAR QA / ${groups[group][0]}: 1000 deterministic cases`,()=>{
  for(let i=0;i<1000;i++){
   const ms=i*37.61+10,strength=i/999,signal=(Math.sin(i*1.17)+1)/2;
   switch(group){
    case 0:{const p=poseAt(ms,strength,STATES[i%STATES.length]);assert.ok(Object.values(p).every(Number.isFinite)&&Math.abs(p.x)<10&&Math.abs(p.y)<10&&Math.abs(p.angle)<3&&p.scale>=0.99&&p.scale<1.02,`pose ${i}`);break;}
    case 1:{const b=blinkAmount(ms,true),st=STATES[i%STATES.length];assert.ok(b>=0&&b<=1&&transition(st,st)===st&&blinkAmount(ms,false)===0,`blink ${i}`);break;}
    case 2:{const sm=smoothEnergy(signal,1-signal,(i%101)/100,((i*7)%101)/100),amp=normalizedAmplitude(new Uint8Array([i%256,(i*7)%256,128]));assert.ok(sm>=0&&sm<=1&&amp>=0&&amp<=1&&Number.isFinite(amp),`audio ${i}`);break;}
    case 3:{const state=STATES[i%STATES.length],v=mouthOpen({energy:signal,phase:state,time:ms,gain:strength});assert.ok(v>=0&&v<=1&&(['idle','thinking','paused'].includes(state)?v===0:true),`mouth ${i}`);break;}
    case 4:{const prof=validateProfile({mouthX:signal,mouthY:signal,eyesY:signal,motion:strength,lipGain:signal,blink:i%2===0});const payload='hello '+i;const valid=dialogueStatus(payload);const jpeg=new Uint8Array([255,216,255,...new Array(9).fill(i%256)]);const reject=new Uint8Array([i%256,1,3,...new Array(9).fill(0)]);assert.ok(prof.mouthX>=.17&&prof.mouthX<=.83&&prof.eyesY>=.2&&prof.eyesY<=.67&&valid.valid&&validateImageHeader(jpeg,'image/jpeg')&&!validateImageHeader(reject,'image/jpeg'),`input ${i}`);break;}
   }
  }
 });
}
test('live avatar invalid payloads throw, and safe defaults remain stable',()=>{
 for(const v of [NaN,Infinity,-Infinity])assert.throws(()=>validateProfile({mouthX:v}));
 assert.throws(()=>transition('idle','ghost'));
 assert.throws(()=>transition('paused','speaking'));
 assert.throws(()=>mouthOpen({time:NaN,phase:'speaking'}));
 assert.throws(()=>blinkAmount(-1));
 assert.equal(dialogueStatus('a'.repeat(3001)).valid,false);
 assert.equal(normalizedAmplitude(new Uint8Array(0)),0);
 assert.equal(validateImageHeader(new Uint8Array(12),'image/png'),false);
 assert.equal(clamp(NaN),0);
});
