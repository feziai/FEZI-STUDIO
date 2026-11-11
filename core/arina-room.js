// One shared live-room authority per Node.js process. Use Redis pub/sub and
// a shared datastore if deploying behind multiple server instances.
import crypto from 'node:crypto';
export const DANCE_STYLES=Object.freeze(['dance-freestyle','dance-rhythm','dance-cute','dance-sway','dance-pose','dance-iranian','dance-wave','dance-party','dance-elegant','dance-chill','dance-fun','dance-pop','dance-energetic']);
export const SCENE_DURATIONS=Object.freeze({idle:120000,reading:2500,typing:2700,thinking:3500,happy:4300,thanks:4500,heart:5200,wink:4200,kiss:4200,dance:60000,return:1200});
export function motionDuration(motion){return motion.startsWith('dance')?60000:SCENE_DURATIONS[motion]||3300}
export function requestedMotion(text){
  const s=String(text||'').toLowerCase();
  if(!/(?:برقص|رقص|رقصی|dance|dancing|حرکات موزون|۶\s*\/\s*۸)/u.test(s))return null;
  if(/فان|خنده.?دار|funny|comedy|بامزه|شیطنت/i.test(s))return 'dance-fun';
  if(/پر.?انرژی|energetic|هیجان|تند/i.test(s))return 'dance-energetic';
  if(/پاپ|kpop|trend|ترند|disco/i.test(s))return 'dance-pop';
  if(/ایرانی|iranian|سنتی|۶\s*\/\s*۸|6\s*\/\s*8/i.test(s))return 'dance-iranian';
  if(/ریتم|rhythm|hip.?hop|هیپ.?هاپ/i.test(s))return 'dance-rhythm';
  if(/ملایم|آرام|slow|sway|نرم/i.test(s))return 'dance-sway';
  if(/cute|کیوت/i.test(s))return 'dance-cute';
  if(/مجلسی|شیک|elegant/i.test(s))return 'dance-elegant';
  if(/party|پارتی|دیسکو/i.test(s))return 'dance-party';
  if(/موج|wave/i.test(s))return 'dance-wave';
  if(/فری|freestyle|آزاد/i.test(s))return 'dance-freestyle';
  return 'dance-rhythm';
}
// Choose among EXISTING clips; do not generate footage or claim reliable mood inference.
export function typingStyleForMessage(message){
  const text=String(message||'').toLowerCase().slice(0,1000);
  if(/(?:ناراحت|غمگین|دلم گرفته|گریه|افسرده|درد دل|تنها|sad|crying|grief|heartbroken)/u.test(text))return 'typing-soft';
  if(/(?:عصبانی|کلافه|اعصابم|دعوا|حرص|angry|furious|frustrated)/u.test(text))return 'typing-frustrated';
  if(/(?:خوشگلی|چقدر نازی|شیطون|عاشقتم|دلبری|flirt|cute|beautiful)/u.test(text))return 'typing-hair';
  return 'typing-normal';
}
export function thresholds(n){return n<=1?1:Math.max(2,Math.ceil(n*.60))}
export function createArinaRoom({secret,now=()=>Date.now(),persist=null,videoIndex={},ambientMinMs=300000,ambientMaxMs=540000,radioSnapshot=null}){
  const sessions=new Map(),subscribers=new Map(),chat=[],votes=new Map();
  let proposal=null,scene={id:crypto.randomUUID(),motion:'idle',startedAt:now(),durationMs:SCENE_DURATIONS.idle,mode:videoIndex.idle?'video':'portrait',...(videoIndex.idle?{video:videoIndex.idle}:{})},seq=0;
  let pendingReplies=0;
  // Server-authoritative occasional subtle reactions. The idle clip itself
  // remains on one uninterrupted timeline for hours (not reset every 120s).
  const nextAmbientDelay=()=>Math.max(1000,ambientMinMs)+(Math.max(ambientMinMs,ambientMaxMs)-Math.max(1000,ambientMinMs)>0?crypto.randomInt(Math.max(ambientMinMs,ambientMaxMs)-Math.max(1000,ambientMinMs)+1):0);
  let nextAmbientAt=now()+nextAmbientDelay(),ambientCount=0;
  const secretHash=Buffer.from(secret);
  function sign(id){return crypto.createHmac('sha256',secretHash).update(id).digest('base64url')}
  function parse(cookie){const m=/(?:^|;\s*)arina_sid=([a-f0-9]{32})\.([A-Za-z0-9_-]+)/.exec(String(cookie||''));if(!m)return null;const mac=sign(m[1]);return m[2].length===mac.length&&crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(m[2]))?m[1]:null}
  function ensure(cookie){let id=parse(cookie),fresh=!id;if(!id)id=crypto.randomBytes(16).toString('hex');sessions.set(id,now());return {id,fresh,cookie:`arina_sid=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`}}
  function present(){const active=new Set([...subscribers.values()]);for(const [id,t] of sessions){if(now()-t<=15000)active.add(id)}return active}
  function viewers(){return present().size}
  function send(res,event){try{res.write('data: '+JSON.stringify(event)+'\n\n')}catch{subscribers.delete(res)}}
  function emit(event){for(const res of subscribers.keys())send(res,event)}
  function snapshot(){return {type:'snapshot',now:now(),scene,proposal:publicProposal(),viewers:viewers(),messages:chat.slice(-60),videoGenerated:Object.keys(videoIndex).length>0,availableVideos:Object.keys(videoIndex),radio:radioSnapshot?.()||null}}
  function publicProposal(){return proposal?{id:proposal.id,motion:proposal.motion,expiresAt:proposal.expiresAt,yes:proposal.yes.size,no:proposal.no.size,required:thresholds(viewers()),viewers:viewers()}:null}
  function addMessage(item){const value={id:crypto.randomUUID(),timestamp:new Date(now()).toISOString(),...item};chat.push(value);if(chat.length>120)chat.shift();emit({type:'message',message:value});persist?.(value);return value}
  function startScene(motion,clipOverride=null){const requestedClip=clipOverride||videoIndex[motion];const clip=requestedClip||(!motion.startsWith('dance')?(['reading','typing','thinking'].includes(motion)?videoIndex.typing:videoIndex.idle):null);const available=typeof clip==='string'&&clip.startsWith('/arina-live/assets/video/');const durationMs=motion.startsWith('dance')?60000:motionDuration(motion);scene={id:crypto.randomUUID(),motion,startedAt:now(),durationMs,mode:available?'video':'portrait',...(available?{video:clip}: {})};nextAmbientAt=now()+nextAmbientDelay();proposal=null;emit({type:'scene',scene,now:now()});emit({type:'proposal',proposal:null});return scene}
  function makeProposal(motion,author){if(proposal&&proposal.expiresAt>now())return {kind:'busy',proposal:publicProposal()};proposal={id:crypto.randomUUID(),motion,author,expiresAt:now()+30000,yes:new Set([author]),no:new Set()};emit({type:'proposal',proposal:publicProposal()});return {kind:'vote',proposal:publicProposal()}}
  function requestMotion(motion,sessionId){if(!DANCE_STYLES.includes(motion))return {kind:'ignored'};if(!videoIndex[motion])return {kind:'video-unavailable',motion};if(scene.motion.startsWith('dance')&&scene.startedAt+scene.durationMs>now())return {kind:'busy',until:scene.startedAt+scene.durationMs};if(viewers()<=1){startScene(motion);return {kind:'started',motion}}return makeProposal(motion,sessionId)}
  function vote(id,proposalId,value){if(!sessions.has(id)||!present().has(id))return {ok:false,reason:'join_first'};if(!proposal||proposal.id!==proposalId||proposal.expiresAt<=now())return {ok:false,reason:'expired'};if(value!=='yes'&&value!=='no')return {ok:false,reason:'invalid_vote'};proposal.yes.delete(id);proposal.no.delete(id);proposal[value].add(id);const tally=publicProposal();if(proposal.yes.size>=thresholds(viewers())){const motion=proposal.motion;startScene(motion);addMessage({kind:'system',name:'Room',text:'درخواست با رأی جمع تأیید شد و اجرا می‌شود.',motion});return {ok:true,kind:'started',motion}}
    if(proposal.no.size>viewers()-thresholds(viewers())){proposal=null;emit({type:'proposal',proposal:null});return {ok:true,kind:'rejected'}}emit({type:'proposal',proposal:publicProposal()});return {ok:true,kind:'pending',tally};}
  function attach(res,id){subscribers.set(res,id);sessions.set(id,now());send(res,snapshot());emit({type:'presence',viewers:viewers()})}
  function detach(res){subscribers.delete(res);emit({type:'presence',viewers:viewers()})}
  function beginReply(message){pendingReplies++;if(!scene.motion.startsWith('dance'))startScene('typing',typeof message==='string'&&message.trim()?videoIndex[typingStyleForMessage(message)]:null);}
  function endReply(){pendingReplies=Math.max(0,pendingReplies-1);if(!pendingReplies&&scene.motion==='typing')startScene('idle');}
  function tick(){
    if(proposal&&proposal.expiresAt<=now()){proposal=null;emit({type:'proposal',proposal:null})}
    if(scene.motion==='idle'&&!pendingReplies){
      // Unlike the old 120s timeout, do not regenerate the idle scene on a timer.
      if(now()>=nextAmbientAt){
        const motions=['reading','happy','thinking'];
        startScene(motions[(ambientCount++)%motions.length]);
      }
    }else if(!(pendingReplies&&scene.motion==='typing')&&scene.startedAt+scene.durationMs<=now()){
      startScene(scene.motion.startsWith('dance')&&videoIndex.return?'return':'idle');
    }
    for(const [k,t] of sessions)if(now()-t>86400000)sessions.delete(k);
  }
  return {ensure,parse,attach,detach,broadcast:emit,present,viewers,snapshot,beginReply,endReply,startScene,requestMotion,vote,tick,addMessage,chat,scene:()=>scene,proposal:()=>publicProposal(),sessions,subscribers};
}
