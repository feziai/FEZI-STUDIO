import fs from 'node:fs';
const load=(p)=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
export const agents=load('../data/agents.json');
export const skills=load('../data/skills.json');
export function publicAgents(statuses={}){
  return agents.map(({id,name,role,accent,icon,avatar})=>({
    id,name,role,accent,icon,avatar,
    status:statuses[id]?.status||'awaiting_token',
    username:statuses[id]?.username||null
  }));
}
export function getAgent(id){return agents.find(a=>a.id===id);}
