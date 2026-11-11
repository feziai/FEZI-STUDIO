// Shared FEZI Studio / Arina radio authority: one station for the entire room.
// Tokens are non-transferable participation privileges, NOT cryptocurrency or money.
import fs from 'node:fs/promises';
import path from 'node:path';

export const RADIO_STATIONS=Object.freeze([
 {id:'zeno',name:'Zeno FM · رپ',src:'https://stream.zeno.fm/ak8z3nnzq8rvv',site:'https://zeno.fm/',genre:'rap'},
 {id:'faaz-https',name:'Radio Faaz · فارسی',src:'https://www.radiofaaz.com/proxy.php/stream',site:'https://www.radiofaaz.com/',genre:'persian'},
 {id:'faaz-http',name:'Radio Faaz · HTTP',src:'http://www.radiofaaz.com:8000/radiofaaz',site:'https://www.radiofaaz.com/',genre:'persian',httpOnly:true},
 {id:'navahang',name:'Radio Navahang',src:'https://navairan.com/;stream.nsv',site:'https://loveradio.app/station/aa408a3b-3d07-415d-8af1-a60b64e07043/radio-navahang',genre:'persian-pop'},
 {id:'swr3',name:'SWR3 · خارجی',src:'https://liveradio.swr.de/sw282p3/swr3/play.mp3',site:'https://loveradio.app/station/240d28b9-7858-48d2-a816-9cf8e1875fe8/swr3',genre:'pop'},
 {id:'kiss',name:'Kiss FM',src:'https://stream.kissfm.de/kissfm/mp3-192/homepage/',site:'https://loveradio.app/station/5c7a7785-6f77-4819-87c0-8776138fe996/kiss-fm',genre:'hip-hop'},
 {id:'persian',name:'محلی · فارسی',src:'/arina-live/assets/audio/arina-persian-original-108bpm.mp3',genre:'persian',local:true},
 {id:'fun',name:'محلی · شاد',src:'/arina-live/assets/audio/arina-fun-original-120bpm.mp3',genre:'fun',local:true},
 {id:'pop',name:'محلی · پاپ',src:'/arina-live/assets/audio/arina-pop-original-128bpm.mp3',genre:'pop',local:true},
 {id:'calm',name:'محلی · آرام',src:'/arina-live/assets/audio/arina-calm-original-92bpm.mp3',genre:'calm',local:true}
]);
const EVERY=5*60_000;
const MAX_TOKENS=12;
const MAX_DAILY_TOKENS=12;
const STARTER_TOKENS=2;
const SWITCHES_PER_TOKEN=3;
const GLOBAL_COOLDOWN=20_000;
const USER_COOLDOWN=45_000;
const DAY=86_400_000;
const idPattern=/^(?:u_[a-f0-9]{32}|s_[a-f0-9]{32})$/;
const error=(message,status=400)=>Object.assign(new Error(message),{status});
export function createArinaSharedRadio({dataDir,now=()=>Date.now(),onChange=()=>{}}){
 const location=path.join(dataDir,'arina-shared-radio.json');
 let state={stationId:'zeno',changedAt:now()-20_000,changedBy:'',sequence:0,users:{}};
 let pendingWrite=Promise.resolve();
 const lookup=id=>RADIO_STATIONS.find(s=>s.id===id);
 function user(key){
  if(!idPattern.test(String(key||'')))throw error('Invalid signed identity',401);
  if(!state.users[key])state.users[key]={tokens:STARTER_TOKENS,uses:0,watchMs:0,lastHeartbeat:0,lastSwitchAt:0,lastVisit:now(),earnedToday:0,day:Math.floor(now()/DAY),giftPasses:0};
  const u=state.users[key];u.lastVisit=now();
  const day=Math.floor(now()/DAY);if(u.day!==day){u.day=day;u.earnedToday=0}
  return u;
 }
 function privateState(key,{hasVerifiedPurchase=false}={}){const u=user(key);const today=Math.floor(now()/DAY);const paid=hasVerifiedPurchase?(u.purchaseDay===today?(u.purchaseUses||0):3):0;return {tokens:u.tokens,uses:u.uses,giftPasses:u.giftPasses,purchasedPasses:paid,remainingSwitches:u.uses+u.tokens*SWITCHES_PER_TOKEN+u.giftPasses+paid,watchProgressMs:u.watchMs,nextTokenInMs:EVERY-u.watchMs,earnedToday:u.earnedToday,intervalMinutes:5,switchesPerToken:SWITCHES_PER_TOKEN,starterTokens:STARTER_TOKENS};}
 function publicState(){return {stationId:state.stationId,changedAt:state.changedAt,sequence:state.sequence,stations:RADIO_STATIONS,globalCooldownRemainingMs:Math.max(0,GLOBAL_COOLDOWN-(now()-state.changedAt)),shared:true,autoplayRequiresGesture:true};}
 function snapshot(key,options={}){return {radio:publicState(),wallet:privateState(key,options)};}
 function save(){const value=JSON.stringify(state);pendingWrite=pendingWrite.then(async()=>{await fs.mkdir(dataDir,{recursive:true});const tmp=location+'.tmp-'+process.pid;await fs.writeFile(tmp,value,{mode:0o600});await fs.rename(tmp,location);});return pendingWrite;}
 async function init(){await fs.mkdir(dataDir,{recursive:true});try{const data=JSON.parse(await fs.readFile(location,'utf8'));if(lookup(data.stationId)&&data.users&&typeof data.users==='object'&&!Array.isArray(data.users)){state={...state,...data};}}
 catch(e){if(e.code!=='ENOENT')throw e}}
 async function attendance(key,{connected=false,hasVerifiedPurchase=false}={}){
  const u=user(key),t=now();if(!connected){u.lastHeartbeat=0;return {earned:0,...privateState(key,{hasVerifiedPurchase})}}
  // On a disconnected/reconnected tab, never grant elapsed background time.
  const elapsed=u.lastHeartbeat&&t>=u.lastHeartbeat&&t-u.lastHeartbeat<=60_000?Math.min(45_000,t-u.lastHeartbeat):0;
  u.lastHeartbeat=t;u.watchMs+=elapsed;
  let earned=0;
  while(u.watchMs>=EVERY&&u.tokens<MAX_TOKENS&&u.earnedToday<MAX_DAILY_TOKENS){u.watchMs-=EVERY;u.tokens++;u.earnedToday++;earned++}
  if(u.watchMs>=EVERY)u.watchMs=EVERY-1; // do not bank unlimited unattended watch time
  if(earned)await save();
  return {earned,...privateState(key,{hasVerifiedPurchase})};
 }
 async function verifiedGift(key,receipt){if(receipt?.ok!==true||!receipt.gift?.id)throw error('Only a trusted completed gift can add privileges',403);const u=user(key);u.giftPasses=Math.min(30,u.giftPasses+3);await save();return privateState(key)}
 async function switchStation(key,stationId,{hasVerifiedPurchase=false,securePage=true}={}){
  const station=lookup(stationId);if(!station)throw error('Unknown radio station',422);
  if(station.httpOnly&&securePage)throw error('HTTP station cannot play from an HTTPS live room',422);
  if(station.id===state.stationId)return {unchanged:true,...snapshot(key,{hasVerifiedPurchase})};
  const u=user(key),t=now();
  if(t-state.changedAt<GLOBAL_COOLDOWN)throw error('Shared radio is cooling down; please wait',429);
  if(t-u.lastSwitchAt<USER_COOLDOWN)throw error('Please wait before switching the shared radio again',429);
  // A verified prepaid wallet grants a small daily privilege, but never unlocks unlimited spam.
  if(hasVerifiedPurchase&&u.purchaseDay!==Math.floor(t/DAY)){u.purchaseDay=Math.floor(t/DAY);u.purchaseUses=3}
  let payment='none';
  if(u.giftPasses>0){u.giftPasses--;payment='verified_gift'}
  else if((u.purchaseUses||0)>0&&hasVerifiedPurchase){u.purchaseUses--;payment='verified_purchase'}
  else if(u.uses>0){u.uses--;payment='earned_token'}
  else if(u.tokens>0){u.tokens--;u.uses=SWITCHES_PER_TOKEN-1;payment='earned_token'}
  else throw error('No radio change credits; watch live for five minutes or send a verified gift',402);
  state.stationId=station.id;state.changedAt=t;state.changedBy=key;state.sequence++;u.lastSwitchAt=t;
  await save();
  onChange({...publicState(),changedByLabel:'یکی از بیننده‌ها',payment});
  return {ok:true,payment,...snapshot(key,{hasVerifiedPurchase})};
 }
 async function register(key,options={}){if(!state.users[key]){user(key);await save();}return snapshot(key,options)}
 return {init,register,attendance,verifiedGift,switchStation,publicState,snapshot,privateState,save,station:id=>lookup(id)};
}
