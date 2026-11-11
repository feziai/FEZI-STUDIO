/** Streaming property checks: 11 * 5,000,000 deterministic cases by default.
 * This is NOT 55 million full end-to-end executions, GPU inference, HTTP
 * requests, deployments, or independent human-authored examples.
 * Each input differs by its numeric case index and is validated by real code.
 * No large fixture file and no fake test counters.
 */
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {projectId,fileName,isSafeStatic,validateModelName} from '../core/validation.js';
import {publicIp} from '../core/web.js';
import {roleForRequest,SPECIALISTS,catalogSummary} from '../core/model-registry.js';
const S=Number(process.env.FEZI_QA_CASES_PER_SUITE||5_000_000);
if(!Number.isSafeInteger(S)||S<1||S>5_000_000)throw Error('FEZI_QA_CASES_PER_SUITE must be integer 1..5,000,000');
const hex=i=>i.toString(16).padStart(16,'0');
const counter={pass:0,failed:0,bySuite:[],seed:'deterministic index 0..N-1',method:'11 streaming invariant suites of distinct inputs; not model inference or E2E'};
const suites=[
 ['project-valid',i=>projectId(hex(i))===hex(i)],
 ['project-invalid',i=>{try{projectId(hex(i).slice(1));return false;}catch{return true;}}],
 ['file-valid',i=>fileName('src/item_'+i+'.js')==='src/item_'+i+'.js'],
 ['file-traversal',i=>{try{fileName('src/../item_'+i+'.js');return false;}catch{return true;}}],
 ['model-valid',i=>validateModelName('Qwen/model-'+i)==='Qwen/model-'+i],
 ['model-traversal',i=>{try{validateModelName('Qwen/../model-'+i);return false;}catch{return true;}}],
 ['static-valid',i=>isSafeStatic('dist/app-'+i+'.html')===true],
 ['static-invalid',i=>isSafeStatic('dist/app-'+i+'.exe')===false],
 ['ip-private',i=>publicIp('10.'+(i%256)+'.'+((i>>>8)%256)+'.'+((i>>>16)%256))===false],
 ['ip-public',i=>publicIp('8.'+(i%256)+'.'+((i>>>8)%256)+'.'+((i>>>16)%256))===true],
 ['routing-multilingual',i=>{
   const type=i%5;
   const prompt= (['تصویر بساز ','debug a bug ','ترجمه کن ','لطفا فیلم بساز ','نقشه راه را برنامه ریزی کن '][type])+i;
   return roleForRequest(prompt)===(['image','code_edit','translation','video','planning'][type]);
 }]
];
const started=performance.now();
for(const [name,fn] of suites){
  const start=performance.now();let passed=0;
  for(let i=0;i<S;i++){
    let ok=false;
    try{ok=fn(i)===true;}catch(error){throw new Error(`${name} #${i}: ${String(error)}`);}
    if(!ok){counter.failed++;throw new Error(`Invariant failed: ${name}, case ${i}`);}
    passed++;
  }
  counter.pass+=passed;
  const row={suite:name,cases:passed,timeMs:Math.round(performance.now()-start)};
  counter.bySuite.push(row);
  console.log(`${name.padEnd(25)} PASS ${String(passed).padStart(10)} (${row.timeMs} ms)`);
}
counter.durationMs=Math.round(performance.now()-started);
counter.modelCatalogEntries=SPECIALISTS.length;
counter.version=catalogSummary().version;
counter.finishedAt=new Date().toISOString();
const output=process.env.FEZI_QA_OUTPUT||'QA/qa-55m-results.json';
fs.mkdirSync(new URL('../QA/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../'+output,import.meta.url),JSON.stringify(counter,null,2));
console.log(`TOTAL ${counter.pass.toLocaleString('en-US')} passed; ${counter.failed} failed; ${counter.durationMs} ms`);
