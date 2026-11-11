import fs from 'node:fs/promises';
import path from 'node:path';

/** On-disk skill library. Skill documents are reference data, NOT executable tools or permissions. */
const MAX_SKILLS=1600;
const MAX_DOC_SIZE=70000;
const STOP=new Set(['for','the','and','with','this','that','from','are','you','can','get','create','build','make','tool','skills','a','in','to','or','of','is','on','my','please']);
const slug=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}\-]+/gu,' ').trim();
const tokens=s=>slug(s).split(/\s+/).filter(t=>t.length>1&&!STOP.has(t)).slice(0,40);
const website=/(website|web app|webapp|html|css|react|next|node|frontend|backend|server|domain|deploy|install|publish|site|builder|seo|سایت|وبسایت|وب‌سایت|کدنویسی|نصب|انتشار|ساخت|ویرایش|ادیت|دیپلوی|هاست)/i;
function frontmatter(text){
  if(!text.startsWith('---\n'))return {};
  const cut=text.indexOf('\n---\n',4);
  if(cut<0||cut>4000)return {};
  const meta={};
  for(const line of text.slice(4,cut).split('\n')){
    const i=line.indexOf(':');if(i<1)continue;
    const key=line.slice(0,i).trim(),value=line.slice(i+1).trim().replace(/^['\"]|['\"]$/g,'');
    if(['name','description','category','source'].includes(key))meta[key]=value.slice(0,240);
  }
  return meta;
}
export function createAgentSkillLibrary({root}){
 const folder=path.join(root,'agent-skills','library');
 let last=[];
 async function refresh(){
   const sources=await fs.readdir(folder,{withFileTypes:true}).catch(()=>[]);
   const list=[];
   for(const dir of sources){
     if(!dir.isDirectory()||!/^[-\w]{1,80}$/.test(dir.name))continue;
     const groups=await fs.readdir(path.join(folder,dir.name),{withFileTypes:true}).catch(()=>[]);
     for(const group of groups){
       if(list.length>=MAX_SKILLS)break;
       if(!group.isDirectory()||!/^[-\w]{2,100}$/.test(group.name))continue;
       const fn=path.join(folder,dir.name,group.name,'SKILL.md');
       const stat=await fs.stat(fn).catch(()=>null);
       if(!stat||!stat.isFile()||stat.size>MAX_DOC_SIZE)continue;
       let raw=await fs.readFile(fn,'utf8').catch(()=>null);
       if(!raw)continue;
       raw=raw.replace(/\0/g,'');
       const meta=frontmatter(raw),title=meta.description||group.name.replace(/-/g,' ');
       const source=dir.name;
       list.push({id:`${source}/${group.name}`,title,source,slug:group.name,category:meta.category||'reference',readiness:'reference_only',
          // No raw third-party prompts or executable code given automatic authority.
          excerpt:raw.replace(/^---\n[\s\S]*?\n---\n/,'').replace(/```[\s\S]*?```/g,'[example code omitted]').slice(0,1800)});
     }
   }
   last=list;return list;
 }
 function select(query,limit=7){
   const q=String(query||'').slice(0,500),terms=tokens(q),wantWebsite=website.test(q);
   const rank=last.map(entry=>{
     const name=slug(entry.slug+' '+entry.title),body=slug(entry.excerpt.slice(0,900));
     let score=0;
     for(const term of terms){if(name.includes(term))score+=6;if(body.includes(term))score+=1;}
     if(wantWebsite && (entry.category==='website'||/website|web-|webapp|build|code|github|deploy|hosting|install|repo|site|rtl|seo/.test(name)))score+=10;
     if(wantWebsite && entry.source==='fezi-agent-core')score+=8;
     if(!terms.length && entry.source==='fezi-agent-core')score+=5;
     return {entry,score};
   }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id));
   return rank.slice(0,Math.max(1,Math.min(30,Number(limit)||7))).map(x=>({...x.entry,score:x.score}));
 }
 function context(query){
   const selected=select(query,6);
   return selected.map(({id,title,excerpt,source})=>`REFERENCE SKILL ${id} — ${title}\n${source==='fezi-agent-core'?excerpt.slice(0,1000):excerpt.slice(0,650)}`).join('\n\n').slice(0,4200);
 }
 return {refresh,list:(q='',limit=30)=>({count:last.length,results:select(q,limit),sources:[...new Set(last.map(x=>x.source))],websiteFirst:true}),context,size:()=>last.length};
}
