/**
 * FEZI Website Controller: scoped text editing for FEZI Studio-owned project files.
 * This is NOT a ChatGPT Sites project editor. It operates only on the FEZI Studio
 * Node.js installation hosting this module, through existing bearer-protected MCP.
 */
import crypto from 'node:crypto';

const fail = (message, status=400)=>Object.assign(new Error(message), {status});
const idPattern = /^[a-f0-9]{16}$/;
const shaPattern = /^[a-f0-9]{64}$/;
const hex = (s)=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const MAX_CONTENT = 100_000;
const MAX_FIND = 20_000;
const MAX_REPLACE = 20_000;
function projectId(id){
  if(typeof id!=='string'||!idPattern.test(id))throw fail('Invalid FEZI Studio project ID');
  return id;
}
function safePath(path){
  if(typeof path!=='string'||path.length>240||path.length<1||path.includes('\\')||path.startsWith('/')||path.includes('\0'))throw fail('Invalid project-relative path');
  const parts=path.split('/');
  if(parts.length>6||parts.some(p=>!p||p==='.'||p==='..'||p.startsWith('.')||!/^[a-zA-Z0-9_ .@()+-]+$/.test(p)))throw fail('Unsafe project-relative path');
  if(parts.some(p=>/^(?:env|\.env|secrets?|credentials?|private[-_.]?key|tokens?)(?:\.|$)/i.test(p)))throw fail('Sensitive configuration path is not editable via ChatGPT MCP');
  if(!/\.(?:html?|css|js|mjs|cjs|jsx|ts|tsx|json|md|svg|txt|vue|svelte|yml|yaml)$/i.test(parts.at(-1)))throw fail('Only allowlisted text file types can be edited');
  return path;
}
function checkEditInput(args={}){
  if(!args||typeof args!=='object'||Array.isArray(args))throw fail('Invalid edit arguments');
  const id=projectId(args.projectId);
  const path=safePath(args.path);
  if(typeof args.find!=='string'||args.find.length<1||args.find.length>MAX_FIND)throw fail('The exact old text must be 1–20000 characters');
  if(typeof args.replace!=='string'||args.replace.length>MAX_REPLACE)throw fail('Replacement must be text up to 20000 characters');
  if(args.find===args.replace)throw fail('Edit has no changes');
  return {id,path,find:args.find,replace:args.replace};
}
function uniqueReplace(text, find, replacement){
  const first=text.indexOf(find);
  if(first<0)throw fail('Original text not found; refresh the file before editing',409);
  if(text.indexOf(find,first+find.length)>=0)throw fail('Original text occurs more than once; make it unique',409);
  const next=text.slice(0,first)+replacement+text.slice(first+find.length);
  if(Buffer.byteLength(next,'utf8')>MAX_CONTENT)throw fail('Edited file exceeds the remote edit size cap',413);
  return {next,offset:first};
}
function redactedPreview(before, after){
  // By default do not echo any source. Project source can contain proprietary data.
  return {removedCharacters:before.length,insertedCharacters:after.length};
}
export function createFeziSiteEditor({metadata,scanFiles,saveFiles,checkpoint}={}){
  if(![metadata,scanFiles,saveFiles,checkpoint].every(f=>typeof f==='function'))throw new Error('Site editor requires injected FEZI Studio services');
  async function filesFor(id){
    await metadata(id); // Fail closed for nonexistent projects.
    return await scanFiles(id);
  }
  return {
    async read(args={}){
      const id=projectId(args.projectId);
      const files=await filesFor(id);
      if(args.path==null)return {projectId:id,paths:Object.keys(files).filter(p=>{try{return safePath(p)===p}catch{return false}}).slice(0,200),total:Object.keys(files).length,siteType:'fezi_studio_self_hosted'};
      const path=safePath(args.path);
      if(!Object.hasOwn(files,path))throw fail('Project file not found',404);
      const content=files[path];
      if(Buffer.byteLength(content,'utf8')>MAX_CONTENT)throw fail('File too large for remote editing',413);
      return {projectId:id,path,content,sha256:hex(content),siteType:'fezi_studio_self_hosted'};
    },
    async preview(args={}){
      const {id,path,find,replace}=checkEditInput(args);
      const files=await filesFor(id);
      if(!Object.hasOwn(files,path))throw fail('Project file not found',404);
      const before=files[path];
      if(Buffer.byteLength(before,'utf8')>MAX_CONTENT)throw fail('File too large for remote editing',413);
      const {next,offset}=uniqueReplace(before,find,replace);
      return {ok:true,stage:'preview_only',projectId:id,path,expectedSha256:hex(before),nextSha256:hex(next),offset,summary:redactedPreview(find,replace),requiresExplicitOwnerApproval:true,siteType:'fezi_studio_self_hosted'};
    },
    async apply(args={}){
      const {id,path,find,replace}=checkEditInput(args);
      if(args.confirm!==true)throw fail('Explicit owner approval required before editing',409);
      if(typeof args.expectedSha256!=='string'||!shaPattern.test(args.expectedSha256))throw fail('A valid preview file SHA-256 is required',409);
      const files=await filesFor(id);
      if(!Object.hasOwn(files,path))throw fail('Project file not found',404);
      const before=files[path];
      if(hex(before)!==args.expectedSha256)throw fail('Project changed since preview; refresh before editing',409);
      const {next}=uniqueReplace(before,find,replace);
      // Existing FEZI Agent checkpoint is required, and failure aborts the edit.
      const backup=await checkpoint(id);
      await saveFiles(id,[{path,content:next}]);
      return {ok:true,stage:'saved_to_fezi_studio',projectId:id,path,previousSha256:args.expectedSha256,sha256:hex(next),checkpoint:backup??null,siteType:'fezi_studio_self_hosted',deployed:false,testsRun:false,warning:'Saved locally; publishing to GitHub or deployment requires a separate authorized operation.'};
    }
  };
}
