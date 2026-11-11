import os from 'node:os';import fs from 'node:fs/promises';
import {MODEL_ROOT,listLocalModels} from '../core/local-models.js';
const r={node:process.version,platform:process.platform,arch:process.arch,cpus:os.availableParallelism?.(),freeRamMiB:Math.round(os.freemem()/1048576),totalRamMiB:Math.round(os.totalmem()/1048576),modelDir:MODEL_ROOT,models:await listLocalModels()};
try{await import('node-llama-cpp');r.nativeRuntime='available';}catch{r.nativeRuntime='not installed';}
console.log(JSON.stringify(r,null,2));
if(r.freeRamMiB<1500)console.warn('WARNING: Limited free RAM; try 0.5B model or use another inference server. On shared hosts OS free memory may not reflect your account limit.');
