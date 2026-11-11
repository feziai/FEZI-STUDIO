import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import official from '../config/faq-official.json' with {type:'json'};
const validText=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max&& !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x);
const problem=(message,status=400)=>Object.assign(new Error(message),{status});
export const officialFaq=official;
export function createFaqCommunity({dataDir}){
 const file=path.join(dataDir,'community-faq.json');let state={questions:[],ratings:{}};
 const attempts=new Map();let queue=Promise.resolve();
 const lock=job=>{const task=queue.then(job);queue=task.catch(()=>{});return task};
 async function save(){const tmp=file+'.'+crypto.randomBytes(5).toString('hex')+'.tmp';await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(tmp,JSON.stringify(state),'utf8');await fs.rename(tmp,file)}
 async function init(){try{const incoming=JSON.parse(await fs.readFile(file,'utf8'));if(Array.isArray(incoming.questions)&&incoming.ratings&&typeof incoming.ratings==='object')state=incoming}catch(e){if(e.code!=='ENOENT')throw e}}
 function totals(id){const v=state.ratings[id]||{};const nums=Object.values(v).filter(x=>Number.isInteger(x)&&x>=1&&x<=5);return {count:nums.length,avg:nums.length?Number((nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2)):null}}
 function published(){return [...official,...state.questions.filter(q=>q.status==='approved')].map(q=>({...q,ratings:totals(q.id)}))}
 function throttle(ip){const now=Date.now();if(attempts.size>2000)for(const [k,v] of attempts)if(now-v.start>3600000)attempts.delete(k);const x=attempts.get(ip)||{start:now,count:0};if(now-x.start>3600000){x.count=0;x.start=now}if(x.count>=5)throw problem('Too many questions; try later',429);x.count++;attempts.set(ip,x)}
 function ask({nickname,question},ip){return lock(async()=>{throttle(ip);if(!validText(question,12,500))throw problem('Question must be 12–500 characters');if(nickname!==undefined&&!validText(nickname,2,45))throw problem('Nickname must be 2–45 characters');if(state.questions.length>=3000)throw problem('Community moderation backlog is full',503);const q={id:'community-'+crypto.randomBytes(9).toString('hex'),nickname:nickname?.trim()||'کاربر',category:'انجمن',question:question.trim(),answer:'',status:'pending',source:'community',createdAt:new Date().toISOString()};state.questions.push(q);await save();return {ok:true,id:q.id,status:q.status,message:'سؤال برای بررسی مدیر ثبت شد.'}})}
 function review(id,action,answer){return lock(async()=>{const q=state.questions.find(q=>q.id===id);if(!q)throw problem('Question not found',404);if(!['approve','reject'].includes(action))throw problem('Invalid action');if(action==='approve'&&!validText(answer,4,2500))throw problem('Answer must be 4–2500 characters');q.status=action==='approve'?'approved':'rejected';q.answer=action==='approve'?answer.trim():'';q.reviewedAt=new Date().toISOString();await save();return {ok:true,id:q.id,status:q.status}})}
 function rate(id,score,session){return lock(async()=>{if(!published().some(q=>q.id===id))throw problem('FAQ not found',404);if(!Number.isInteger(score)||score<1||score>5)throw problem('Score must be 1–5');if(!validText(session,10,200))throw problem('Session required');const key=crypto.createHash('sha256').update(session).digest('hex').slice(0,32);const ratings=state.ratings[id]||{};if(Object.keys(ratings).length>=10000&&!Object.hasOwn(ratings,key))throw problem('Rating limit reached',429);ratings[key]=score;state.ratings[id]=ratings;await save();return {ok:true,...totals(id)}})}
 function pending(){return state.questions.filter(q=>q.status==='pending')}
 return {init,published,pending,ask,review,rate};
}
