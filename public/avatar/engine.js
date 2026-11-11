// FEZI AGENT Live Avatar: deterministic, browser-safe animation primitives.
// No ML/video-generation claims. GPU realism requires a separate worker.
export const STATES=Object.freeze(['idle','listening','thinking','speaking','paused']);
export const DEFAULT_PROFILE=Object.freeze({mouthX:0.5,mouthY:0.67,eyesY:0.41,motion:0.42,lipGain:0.85,blink:true});
export function clamp(value,min=0,max=1){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min;}
export function validateProfile(profile={}){
  if(!profile || typeof profile!=='object'||Array.isArray(profile))throw new TypeError('Invalid avatar profile');
  const data={};for(const [key,fallback] of Object.entries(DEFAULT_PROFILE)){
    if(key==='blink'){data.blink=profile.blink===undefined?fallback:profile.blink===true;continue;}
    const v=profile[key]===undefined?fallback:Number(profile[key]);
    if(!Number.isFinite(v))throw new TypeError('Invalid avatar parameter: '+key);
    data[key]=clamp(v,key==='mouthX'?0.17:key==='mouthY'?0.35:key==='eyesY'?0.2:0,key==='mouthX'?0.83:key==='mouthY'?0.87:key==='eyesY'?0.67:1);
  }return data;
}
export function transition(current,next){
  if(!STATES.includes(current)||!STATES.includes(next))throw new RangeError('Invalid avatar state');
  const allowed={idle:['idle','listening','thinking','speaking','paused'],listening:['listening','thinking','speaking','idle','paused'],thinking:['thinking','speaking','idle','paused'],speaking:['speaking','idle','listening','paused'],paused:['paused','idle']};
  if(!allowed[current].includes(next))throw new RangeError(`Invalid avatar transition ${current} -> ${next}`);
  return next;
}
export function smoothEnergy(previous,current,attack=0.52,release=0.16){
  const p=clamp(previous),n=clamp(current),a=clamp(n>p?attack:release);return clamp(p+(n-p)*a);
}
export function mouthOpen({energy=0,phase='idle',time=0,gain=1}={}){
  if(!Number.isFinite(time))throw new TypeError('Invalid time');
  if(!STATES.includes(phase))throw new RangeError('Invalid avatar state');
  if(phase!=='speaking'&&phase!=='listening')return 0;
  // A microphone/audio file supplies real amplitude; browser speechSynthesis supplies a heuristic motion.
  return clamp((0.06+0.94*clamp(energy))*clamp(gain));
}
export function blinkAmount(ms,enabled=true){
  if(!Number.isFinite(ms)||ms<0)throw new TypeError('Invalid time');
  if(!enabled)return 0;
  const period=3300+420*Math.sin(Math.floor(ms/3500)*1.91);
  const p=(ms%period)/period;
  const close=Math.max(0,1-Math.abs(p-0.5)/0.027);
  return clamp(close*close*(3-2*close));
}
export function poseAt(ms,motion=0.42,phase='idle'){
  if(!Number.isFinite(ms)||ms<0)throw new TypeError('Invalid time');
  if(!STATES.includes(phase))throw new RangeError('Invalid avatar state');
  const strength=clamp(motion)*(phase==='paused'?0:phase==='thinking'?0.5:1),t=ms/1000;
  return {x:(Math.sin(t*0.47)+0.35*Math.sin(t*1.07))*2.5*strength,
    y:Math.sin(t*1.08)*2.8*strength,angle:Math.sin(t*0.41)*1.1*strength,
    scale:1+Math.sin(t*1.08)*0.005*strength};
}
export function validateImageHeader(bytes,type){
  if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>8_000_000)return false;
  if(type==='image/png')return bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10;
  if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(type==='image/webp')return String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  return false;
}
export function dialogueStatus(text){const value=String(text??'').trim();return {valid:value.length>=2&&value.length<=3000,length:value.length};}
export function normalizedAmplitude(byteData){
  if(!byteData?.length)return 0;
  let sum=0;for(const x of byteData){const a=(Number(x)-128)/128;sum+=a*a;}
  return clamp(Math.sqrt(sum/byteData.length)*3.8);
}
