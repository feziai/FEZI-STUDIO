import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {readOwnerExport,mergeGeneratePromptRecords} from '../core/generateprompt-importer.mjs';
const demo={sourceUrl:'https://generateprompt.net/image-prompts/test-user-owned-example',title:'Test user owned example',kind:'image',category:'Fashion',prompt:'Create a cinematic fashion portrait with studio lighting and a blue backdrop.',media:[{type:'image',url:'https://res-a.generateprompt.net/test.webp'}]};
test('JSONL and gzip JSONL preserve owner metadata',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-gp-jsonl-'));
 try{
  const f=path.join(dir,'archive.jsonl');await fs.writeFile(f,JSON.stringify(demo)+'\n');
  const gz=path.join(dir,'archive.jsonl.gz');await fs.writeFile(gz,gzipSync(JSON.stringify(demo)+'\n'));
  for(const file of [f,gz]){const rows=await readOwnerExport(file);assert.equal(rows.length,1);assert.equal(rows[0].media.length,1);assert.equal(rows[0].rights,'owner_attested')}
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('malformed JSONL is reported with line number',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-gp-invalid-'));
 try{const f=path.join(dir,'bad.ndjson');await fs.writeFile(f,JSON.stringify(demo)+'\n{broken\n');await assert.rejects(()=>readOwnerExport(f),/line 2/)}finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('owner JSON and gzip JSON archives remain supported',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-gp-json-'));
 try{const f=path.join(dir,'data.json.gz');await fs.writeFile(f,gzipSync(JSON.stringify({records:[demo]})));assert.equal((await readOwnerExport(f)).length,1)}finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('two imports deduplicate using persistent store',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-gp-store-'));
 try{const rows=[...(await (async()=>{const f=path.join(dir,'archive.json');await fs.writeFile(f,JSON.stringify([demo]));return readOwnerExport(f)})())];
 assert.equal((await mergeGeneratePromptRecords({dataDir:dir,records:rows,dryRun:false})).added,1);
 assert.equal((await mergeGeneratePromptRecords({dataDir:dir,records:rows,dryRun:false})).added,0);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
