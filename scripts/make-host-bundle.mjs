// Bundle Node source + any already downloaded real GGUF weights into a single archive.
// Run on a machine with 'tar'. This NEVER generates or fakes AI weights.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {listLocalModels} from '../core/local-models.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const models=await listLocalModels();
const installed=models.filter(x=>x.installed);
if(!installed.length){console.error('No genuine model installed. Run npm run model:download -- coder-mini first.');process.exit(1);}
const name=path.join(ROOT,'FEZI-Studio-node-host-with-models.tar.gz');
const include=['app.js','server.js','integrations.js','mcp.js','telegram.js','package.json','LICENSE','README.md','.env.example','core','public','plugin','docs','tools','scripts','models'];
const args=['-czf',name,'-C',ROOT,...include];
const proc=spawn('tar',args,{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{proc.once('error',reject);proc.once('exit',resolve)});
if(code!==0)process.exit(code||1);
console.log(`Created ${name} with ${installed.length} genuine GGUF file(s): ${installed.map(x=>x.name).join(', ')}`);
console.log('Sensitive data/, .env, tokens and secrets were excluded.');
