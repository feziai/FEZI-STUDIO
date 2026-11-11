#!/usr/bin/env node
/** Usage:
 * node scripts/import-generateprompt.mjs --export /secure/generateprompt-export.jsonl.gz --owner-confirmed --commit
 * node scripts/import-generateprompt.mjs --crawl --owner-confirmed --commit --limit 300
 * node scripts/import-generateprompt.mjs --site-dir /secure/html-export --owner-confirmed --commit
 * Default is DRY RUN. Never pass credentials or arbitrary hosts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {discoverGeneratePromptPages,isPromptDetail,parseGeneratePromptHtml,readOwnerExport,readHtmlArchive,mergeGeneratePromptRecords} from '../core/generateprompt-importer.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const args=process.argv.slice(2),has=x=>args.includes(x),get=x=>{const i=args.indexOf(x);return i<0?'':args[i+1]||''};
const commit=has('--commit'),confirmed=has('--owner-confirmed')||process.env.GENERATEPROMPT_OWNER_CONFIRMED==='1';
if(commit&&!confirmed)throw Error('To publish owner source prompts, pass --owner-confirmed and --commit');
const mode=has('--export')?'export':has('--site-dir')?'html':has('--crawl')?'crawl':'';
if(!mode){console.log('Choose --export PATH (JSON/JSONL/NDJSON, optionally .gz) (recommended), --site-dir FOLDER or --crawl; add --owner-confirmed --commit to publish. Default: dry run.');process.exit(2)}
const dataDir=path.resolve(process.env.DATA_DIR||path.join(root,'data'));
const limit=Math.min(20000,Math.max(1,Number.parseInt(get('--limit')||'300',10)||300));
const checkpoint=path.join(dataDir,'prompts-v16','generateprompt-sync-checkpoint.json');
let records=[],notes=[],discovered=0,attempted=0,pending=0,committedUrls=[];
if(mode==='export'){records=await readOwnerExport(path.resolve(get('--export')));discovered=records.length;}
if(mode==='html'){records=await readHtmlArchive(path.resolve(get('--site-dir')));discovered=records.length;}
if(mode==='crawl'){
 const errors=[];const discoveredPages=await discoverGeneratePromptPages({onError:(url,e)=>errors.push({url,error:String(e.message||e).slice(0,160)})});
 discovered=discoveredPages.urls.length;
 let done=new Set();try{const p=JSON.parse(await fs.readFile(checkpoint,'utf8'));done=new Set(p.done||[]);}catch{}
 const todo=discoveredPages.urls.filter(u=>!done.has(u));pending=todo.length;
 const run=todo.slice(0,limit);const slept=ms=>new Promise(r=>setTimeout(r,ms));
 for(const url of run){attempted++;try{
  if(!isPromptDetail(url))throw Error('not a prompt');
  const response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'FEZIStudioOwnerMigration/1.0'},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const html=await response.text();if(html.length>5_000_000)throw Error('Oversize');
  const out=parseGeneratePromptHtml(html,url);
  if(out.status==='ready'){records.push(out.record);committedUrls.push(url)}else errors.push({url,reason:out.reason});
 }catch(e){errors.push({url,error:String(e.message||e).slice(0,140)})}
 // Checkpoint is written only after records have been committed to the persistent store.
 await slept(450);}
 notes={listingChecked:discoveredPages.listingChecked,sitemapsChecked:discoveredPages.sitemapsChecked,errors:errors.slice(0,25),errorsTotal:errors.length,remainingBeforeRun:pending};
}
const result=await mergeGeneratePromptRecords({dataDir,records,dryRun:!commit});
if(commit&&mode==='crawl'){let prior=[];try{prior=JSON.parse(await fs.readFile(checkpoint,'utf8')).done||[]}catch{}await fs.mkdir(path.dirname(checkpoint),{recursive:true});await fs.writeFile(checkpoint,JSON.stringify({done:[...new Set([...prior,...committedUrls])],lastChecked:new Date().toISOString()},null,2));}
const report={site:'GeneratePrompt.net',mode,fullArchiveConfirmed:mode==='export'&&has('--complete-export'),discovered,attempted,parsed:records.length,...result,notes};
console.log(JSON.stringify(report,null,2));
if(commit){await fs.mkdir(path.join(dataDir,'prompts-v16'),{recursive:true});await fs.writeFile(path.join(dataDir,'prompts-v16','generateprompt-last-sync.json'),JSON.stringify(report,null,2));}
