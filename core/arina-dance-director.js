/**
 * FEZI AGENT — Arina choreography *planner*, not a video generator.
 * Storyboards are reference material only. Production playback requires
 * video generated from motion-reference footage and approved by a reviewer.
 * All beats are server-coordinated. Camera remains fixed and framing consistent.
 */
const groups = {
  fun: ['kitty-claws','double-peace','finger-guns','finger-heart','cheek-poke','tiny-punch','bunny-hop','happy-clap','funny-shimmy','silly-wiggle','shoulder-bounce','head-bob','paw-paw','air-kiss','hug-pose','fluffy-hat','happy-point','playful-salute','comic-shrug','victory-bounce'],
  persian: ['six-eight-step','persian-shoulder','persian-handwave','persian-sway','persian-turn','persian-circle','persian-bounce','persian-hands'],
  pop: ['kpop-point','pop-hip-sway','pop-hair-flip','pop-heart','pop-wave','pop-groove','disco-point','disco-step'],
  smooth: ['gentle-wave','soft-sway','smooth-turn','graceful-arm','elegant-pose','slow-groove','calm-bounce','side-step'],
  energetic: ['festival-bounce','power-wave','rhythm-step','joyful-turn','dynamic-point','freestyle-arm','hype-clap','party-groove']
};
export const DANCE_MOVES=Object.freeze(Object.entries(groups).flatMap(([category,names])=>names.map((name,index)=>Object.freeze({id:name,category,pace:category==='smooth'?'calm':category==='energetic'?'fast':'medium',entry:index%3===0?'center':'center',exit:'center',camera:'locked-tripod',source:'motion-reference-video-required'}))));
export const DANCE_CATEGORIES=Object.freeze(Object.keys(groups));
const byCategory=Object.fromEntries(DANCE_CATEGORIES.map(c=>[c,DANCE_MOVES.filter(m=>m.category===c)]));
export function chooseCategory(text=''){
  const t=String(text).toLowerCase();
  if(/ایرانی|سنتی|۶\s*\/\s*۸|6\s*\/\s*8|persian|iranian/.test(t))return 'persian';
  if(/فان|بامزه|خنده|fun|funny|cute|کیوت|comedy|شوخی/.test(t))return 'fun';
  if(/آرام|ملایم|sway|smooth|slow|elegant/.test(t))return 'smooth';
  if(/انرژی|پرشور|هیجان|پار‌تی|party|energetic|fast/.test(t))return 'energetic';
  if(/kpop|پاپ|دیسکو|disco|hip.?hop|ترند|trend/.test(t))return 'pop';
  return 'fun';
}
export function chooseBpm(category){return ({fun:120,persian:108,pop:128,smooth:92,energetic:136})[category]||120}
const stableHash=x=>{let h=2166136261;for(const c of String(x)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
function seeded(seed){let n=seed||1;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)}
/** Plan 1–2 minute sequence. Transitions occur at musical bar boundaries.
 * Plans are metadata for a renderer, never stitched still frames.
 */
export function planDance({prompt='',category=chooseCategory(prompt),durationSeconds=60,bpm=chooseBpm(category),seed='arina'}={}){
  if(!DANCE_CATEGORIES.includes(category))throw Error('Unknown category');
  if(!Number.isFinite(durationSeconds)||durationSeconds<60||durationSeconds>120)throw Error('Dance duration must be 60-120s');
  if(!Number.isFinite(bpm)||bpm<70||bpm>170)throw Error('Unsupported BPM');
  const beatSeconds=60/bpm,barSeconds=beatSeconds*4,random=seeded(stableHash(`${seed}/${prompt}/${category}/${bpm}`));
  const pool=byCategory[category],secondary=byCategory[category==='fun'?'pop':'fun'];
  const segments=[];let beat=0,previous=null,phase=0;
  const targetBeats=Math.round(durationSeconds/beatSeconds/4)*4;
  while(beat<targetBeats){
    const isLast=targetBeats-beat<=16;
    const bars=isLast?Math.round((targetBeats-beat)/4):Math.min(4,Math.max(2,Math.floor(2+random()*2.8)));
    const candidates=(phase++%4===3?secondary:pool).filter(m=>m.id!==previous?.id && m.entry===(previous?.exit||'center'));
    const move=candidates[Math.floor(random()*candidates.length)]||pool[0];
    const count=Math.min(bars*4,targetBeats-beat);
    if(count<=0)break;
    const startSecond=Number((beat*beatSeconds).toFixed(3));
    const endSecond=Number(((beat+count)*beatSeconds).toFixed(3));
    segments.push({moveId:move.id,category:move.category,startSecond,endSecond,beats:count,transition:'pose-matched-video',camera:'fixed',requireFaceConsistency:true});
    beat+=count;previous=move;
  }
  return {kind:'choreography-plan-not-video',source:'uploaded-storyboards + licensed motion-reference-footage',category,bpm,durationSeconds:Number((targetBeats*beatSeconds).toFixed(3)),requestedSeconds:durationSeconds,aspectRatio:'16:9',delivery:'1920x1080@30fps MP4',continuousCamera:true,segments};
}
export function validateVideoSpec(spec){
  if(!spec||!Number.isFinite(spec.width)||!Number.isFinite(spec.height)||!Number.isFinite(spec.fps)||!Number.isFinite(spec.duration))return {ok:false,reason:'missing metadata'};
  if(spec.width<1920||spec.height<1080)return {ok:false,reason:'below Full HD'};
  if(Math.abs(spec.width/spec.height-16/9)>0.015)return {ok:false,reason:'aspect ratio not 16:9'};
  if(spec.fps<24)return {ok:false,reason:'frame rate below 24'};
  if(spec.duration<59.5||spec.duration>121)return {ok:false,reason:'duration not 60-120 seconds'};
  return {ok:true};
}
