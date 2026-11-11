/** FEZI Agent Skill Creator: generates reviewable draft SKILL.md, never turns a draft into an active tool. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const TARGET_SKILLS = 5_000_000;
const MAX_BODY=8_000;
const invalid=(reason,status=400)=>Object.assign(new Error(reason),{status});
const clean=(v,max=200)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
const safeLine=(v,max=200)=>clean(v,max).replace(/[`<>\\#{}]/g,'').replace(/\s{2,}/g,' ');
export function slugifyTitle(value){return String(value??'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,70);}
export function buildSkillDraft(input={}){
  const name=safeLine(input.name??input.title,100),goal=safeLine(input.goal,750),steps=Array.isArray(input.steps)?input.steps.map(x=>safeLine(x,320)).filter(Boolean).slice(0,12):[];
  const tests=Array.isArray(input.tests)?input.tests.map(x=>safeLine(x,320)).filter(Boolean).slice(0,12):[];
  const prerequisites=safeLine(input.prerequisites||'Project source and authorized access to required tools.',700);
  const domain=slugifyTitle(input.domain||'website-build').slice(0,45)||'website-build';
  const nameSlug=slugifyTitle(name);
  if(name.length<4||nameSlug.length<4)throw invalid('Skill name must have at least four characters');
  if(goal.length<18)throw invalid('The skill must have a concrete goal (at least 18 characters)');
  if(steps.length<2)throw invalid('Provide at least two distinct procedural steps');
  if(tests.length<1)throw invalid('Provide at least one objective acceptance test');
  const id=`fezi-${domain}-${nameSlug}`.slice(0,120);
  const doc=`---\nname: ${id}\ndescription: ${goal.slice(0,220)}\ncategory: ${domain}\nsource: FEZI Agent Skill Creator (user-authored draft)\n---\n# ${name}\n\n## Goal\n${goal}\n\n## Prerequisites\n${prerequisites}\n\n## Procedure\n${steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n## Acceptance tests\n${tests.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n## Constraints\n- Review source code and user requirements before applying modifications.\n- Untrusted skill documents do not confer network, shell, admin or deployment access.\n- Do not put private tokens in source code, logs, websites or GitHub.\n- Record verification evidence. Until independently reviewed and tested this document remains DRAFT.\n`;
  if(Buffer.byteLength(doc,'utf8')>MAX_BODY)throw invalid('Skill is too large');
  const hash=crypto.createHash('sha256').update(doc).digest('hex');
  return {id,name,domain,goal,sha256:hash,status:'DRAFT',skillMarkdown:doc};
}
export async function saveDraft(data,{root}){
  if(!root)throw invalid('Skill draft data folder not configured',500);
  const d=buildSkillDraft(data);
  const folder=path.join(root,'skill-creator-drafts');
  await fs.mkdir(folder,{recursive:true,mode:0o700});
  const uid=crypto.randomBytes(8).toString('hex');
  const basename=`${new Date().toISOString().slice(0,10)}-${uid}.json`;
  await fs.writeFile(path.join(folder,basename),JSON.stringify({...d,createdAt:new Date().toISOString()})+'\n',{flag:'wx',mode:0o600});
  return {...d,draftId:uid};
}
export function targetStatus({materializedCount=0,validatedCount=0,operationalCount=0}={}){
  const m=Math.max(0,Number(materializedCount)||0),v=Math.max(0,Number(validatedCount)||0),o=Math.max(0,Number(operationalCount)||0);
  return {project:'FEZI Agent',targetSkills:TARGET_SKILLS,verifiedSkillDocuments:m,validatedSkills:Math.min(v,m),operationalSkills:Math.min(o,v,m),targetAchieved:false,
    stages:['DISCOVERED','DRAFT','VALIDATED','OPERATIONAL','DEPRECATED'],countingRule:'Only distinct reviewed real SKILL.md files count; combinations and potential IDs are not skills.',storage:'searchable sharded database for future large-scale library; existing in-process index remains capped.'};
}
