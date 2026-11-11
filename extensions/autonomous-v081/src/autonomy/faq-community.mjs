import { randomUUID } from 'node:crypto';
import { readJSON, atomicJSON } from './event-store.mjs';
const trim=(x,max)=>String(x??'').trim().slice(0,max);
function validate(content,{min=3,max=2000}={}){
  if(typeof content!=='string'||content.trim().length<min||content.length>max)throw new Error('Invalid content length');
  if(/(?:https?:\/\/\S+\s*){4,}/i.test(content))throw new Error('Too many links');
}
export function createFAQStore(path){
  let serial=Promise.resolve();
  const mutate=fn=>{
    const next=serial.then(async()=>{
      const data=await readJSON(path,{questions:[],answers:[]});
      const result=fn(data);await atomicJSON(path,data);return result;
    });serial=next.catch(()=>{});return next;
  };
  return {
    async questions({includePending=false}={}){
      const db=await readJSON(path,{questions:[],answers:[]});
      return db.questions.filter(q=>includePending||q.status==='published').map(q=>({...q,answers:db.answers.filter(a=>a.questionId===q.id&&(includePending||a.status==='published'))}));
    },
    async submitQuestion({userId,text}){
      if(!userId)throw new Error('Authenticated user required');validate(text,{min:8,max:1000});
      return mutate(db=>{
        const duplicate=db.questions.find(q=>q.text.toLocaleLowerCase('fa')===text.trim().toLocaleLowerCase('fa'));
        if(duplicate)return {id:duplicate.id,duplicate:true,status:duplicate.status};
        const q={id:randomUUID(),userId:trim(userId,80),text:text.trim(),status:'pending',createdAt:new Date().toISOString(),official:false};
        db.questions.push(q);return q;
      });
    },
    async submitAnswer({userId,questionId,text}){
      if(!userId)throw new Error('Authenticated user required');validate(text,{min:3,max:2000});
      return mutate(db=>{
        const q=db.questions.find(x=>x.id===questionId&&x.status==='published');if(!q)throw new Error('Question unavailable');
        const ans={id:randomUUID(),userId:trim(userId,80),questionId,text:text.trim(),status:'pending',official:false,createdAt:new Date().toISOString()};
        db.answers.push(ans);return ans;
      });
    },
    async moderate({entity,id,status,official=false}){
      if(!['published','rejected','pending'].includes(status))throw new Error('Invalid moderation status');
      return mutate(db=>{
        const arr=entity==='question'?db.questions:entity==='answer'?db.answers:null;
        if(!arr)throw new Error('Invalid entity');
        const x=arr.find(x=>x.id===id);if(!x)throw new Error('Not found');
        x.status=status;x.official=!!official&&status==='published';return x;
      });
    }
  };
}
