/** Explicit owner-side provisioning only: never downloads weights from public page requests. */
import {spawnSync} from 'node:child_process';
const allow=new Map([['qwen2.5:3b','Persian/English small chat'],['qwen2.5-coder:1.5b','lightweight coding'],['gemma3:1b','small fallback']]);
const mode=process.argv[2]||'doctor';
if(!['doctor','pull'].includes(mode)){console.error('Usage: npm run ollama:doctor | npm run ollama:pull -- qwen2.5:3b');process.exit(2)}
function ollama(...args){return spawnSync('ollama',args,{stdio:'inherit',shell:false,timeout:mode==='pull'?600000:12000});}
if(mode==='doctor'){
 const result=ollama('list');
 if(result.error||result.status!==0){console.error('Ollama is not running or not installed on this host. Install Ollama first; no files were downloaded.');process.exit(1)}
 console.log('Ollama CLI found. Model weights listed above; API /api/tags and a generation request are also required for end-to-end health.');
}else{
 const model=process.argv[3];if(!allow.has(model)){console.error('Unsupported or missing model name. Allowlisted: '+[...allow.keys()].join(', '));process.exit(2)}
 console.log('Manual model download for authorized server operator: '+model+' — '+allow.get(model));
 const result=ollama('pull',model);
 if(result.error||result.status!==0){console.error('Model download failed or timed out. Check free disk space, RAM and Ollama installation.');process.exit(1)}
 console.log('Downloaded to this machine, NOT automatically to a remote worker. Verify via `ollama list`.');
}
