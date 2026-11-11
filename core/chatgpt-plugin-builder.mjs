// FEZI Studio: portable skills-only plugin generator for @plugin-creator handoff.
// This does NOT register or publish a ChatGPT plugin on behalf of any user.
const problem=(msg)=>Object.assign(new Error(msg),{status:400});
export function normalizeChatGPTPlugin(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw problem('Invalid plugin spec');
 const n=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 const name=n(input.name,75),purpose=n(input.purpose,400),workflow=n(input.workflow,5000);
 if(name.length<3||purpose.length<12||workflow.length<12)throw problem('Name, purpose (12+) and workflow (12+) are required');
 let slug=name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55);
 if(!slug)slug='fezi-custom-plugin';
 slug=slug.replace(/-$/,'');
 if(!/^[a-z][a-z0-9-]{2,62}$/.test(slug))slug='fezi-custom-plugin';
 // User-generated instructions are stored only in the skill text, never shell/scripts or executable code.
 const safe=v=>v.replaceAll('\0','').replace(/(^|\n)---(?=\n)/g,'$1—').replaceAll('<script','&lt;script');
 return {name:safe(name),slug,description:safe(purpose),workflow:safe(workflow)};
}
export function makeChatGPTPluginFiles(raw){
 const s=normalizeChatGPTPlugin(raw);
 const manifest={"$schema":"https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",name:s.slug,version:'0.1.0',description:s.description,
   author:{name:'FEZI Studio user'},extensions:{'com.openai':{interface:{displayName:s.name,developerName:'FEZI Studio',category:'Productivity',capabilities:['Read'],shortDescription:s.description.slice(0,100)}}}};
 const compat={name:s.slug,version:'0.1.0',description:s.description,author:{name:'FEZI Studio user'},skills:'./skills',interface:{displayName:s.name,developerName:'FEZI Studio',category:'Productivity',capabilities:['Read'],shortDescription:s.description.slice(0,100)}};
 const skill=`---\nname: ${s.slug}\ndescription: ${JSON.stringify(s.description).replaceAll('\\n',' ')}\n---\n\n# ${s.name}\n\n## Purpose\n${s.description}\n\n## Workflow\n${s.workflow}\n\n## Access boundaries\n- This skill provides instructions only; it does not grant external tools or credentials.\n- Before any remote writes, request authorized connected tools and user-approved scope.\n- Do not disclose keys, claim fictional deployment, or silently use paid APIs.\n- Preserve user data; ask before deleting or publishing.\n`;
 const readme=`# ${s.name}\n\nبسته پلاگین قابل استفاده در Plugin Creator ساخته شده است.\n\n1. وارد ChatGPT شوید و Plugin Creator رسمی را باز کنید.\n2. این ZIP را به آن بدهید و بگویید آن را به‌عنوان یک پلاگین خصوصی بررسی و ایجاد کند.\n3. برای وصل‌شدن به GitHub، تلگرام و سرویس‌های خارجی باید MCP و مجوزهای همان سرویس جداگانه اضافه شوند.\n4. این بسته خودش نه روی سرور ChatGPT نصب شده و نه برای عموم منتشر شده است.\n\nOfficial docs: https://developers.openai.com/plugins/build/plugins\n`;
 return {'plugin.json':JSON.stringify(manifest,null,2),'.codex-plugin/plugin.json':JSON.stringify(compat,null,2),[`skills/${s.slug}/SKILL.md`]:skill,'README_FA.md':readme};
}
