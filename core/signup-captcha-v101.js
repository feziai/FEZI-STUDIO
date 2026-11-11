/** One-time server-side challenge for FEZI signup. Never embed the answer in the token. */
import crypto from 'node:crypto';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bad=(msg,status=400)=>Object.assign(new Error(msg),{status});
const equal=(a,b)=>Buffer.from(String(a)).length===Buffer.from(String(b)).length && crypto.timingSafeEqual(Buffer.from(String(a)),Buffer.from(String(b)));
export function createSignupCaptcha({secret=crypto.randomBytes(32).toString('hex'),ttl=180000}={}){
 const pending=new Map(); const requests=new Map();
 function issue(ip=''){
  const now=Date.now(),k=String(ip).slice(0,100),hits=(requests.get(k)||[]).filter(t=>t>now-600000);
  if(hits.length>=40)throw bad('Too many CAPTCHA requests',429);hits.push(now);requests.set(k,hits);
  if(pending.size>3000){for(const [key,x] of pending)if(x.expires<now)pending.delete(key);if(pending.size>3000)pending.clear()}
  let answer='';for(let i=0;i<6;i++)answer+=ALPHABET[crypto.randomInt(ALPHABET.length)];
  const id=crypto.randomBytes(16).toString('hex'),signature=crypto.createHmac('sha256',secret).update(id).digest('hex');
  pending.set(id,{answer,expires:now+ttl,ip:k,attempts:0});
  const random=(min,max)=>min+crypto.randomInt(max-min+1);
  const colors=['#ff4fa8','#9c42ea','#245ce0','#e46bbc','#583ec9'];
  const letter=answer.split('').map((c,i)=>{
   const x=24+i*51+random(-3,4),y=random(66,78),a=random(-12,12);
   return `<text x="${x}" y="${y}" fill="${colors[i%5]}" font-family="Verdana,Arial,sans-serif" font-size="${random(40,47)}" font-weight="900" transform="rotate(${a} ${x} ${y})">${esc(c)}</text>`;
  }).join('');
  const lines=Array.from({length:5},(_,i)=>`<path d="M ${random(0,45)} ${random(15,110)} Q ${random(90,175)} ${random(4,110)} ${random(245,340)} ${random(12,115)}" fill="none" stroke="${colors[i]}" stroke-width="${random(1,3)}" opacity=".28"/>`).join('');
  const dots=Array.from({length:35},()=>`<circle cx="${random(3,337)}" cy="${random(3,119)}" r="${random(1,3)}" fill="${colors[random(0,4)]}" opacity=".35"/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="340" height="122" viewBox="0 0 340 122" role="img" aria-label="Six-character registration CAPTCHA"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fdf5ff"/><stop offset="1" stop-color="#dcecff"/></linearGradient></defs><rect x="1" y="1" width="338" height="120" rx="21" fill="url(#bg)" stroke="#ec9edf" stroke-width="2"/><path d="M15 24 Q30 8 45 24 Q32 34 15 24" fill="#ffc0e8" opacity=".5"/>${dots}${lines}${letter}<text x="260" y="17" font-size="10" fill="#6455ac">FEZI</text></svg>`;
  return {id,token:`${id}.${signature}`,image:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),expiresSeconds:Math.floor(ttl/1000),length:6};
 }
 function verify(token,guess,ip=''){
  const m=/^([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(String(token||''));
  if(!m)throw bad('CAPTCHA missing or invalid',422);
  const expected=crypto.createHmac('sha256',secret).update(m[1]).digest('hex');
  if(!equal(expected,m[2]))throw bad('CAPTCHA signature invalid',422);
  const entry=pending.get(m[1]);if(!entry||entry.expires<Date.now()||entry.attempts>=3)throw bad('CAPTCHA expired; request a new one',422);
  if(entry.ip!==String(ip).slice(0,100))throw bad('CAPTCHA session mismatch',422);
  entry.attempts++;
  const okay=typeof guess==='string' && /^[A-Z0-9]{6}$/i.test(guess.trim()) && equal(entry.answer,guess.trim().toUpperCase());
  if(okay)pending.delete(m[1]);else if(entry.attempts>=3)pending.delete(m[1]);
  if(!okay)throw bad('CAPTCHA answer incorrect',422);
  return true;
 }
 return {issue,verify};
}
