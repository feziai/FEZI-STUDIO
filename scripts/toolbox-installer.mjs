#!/usr/bin/env node
// Explicit, safe subset installer. NO shell injection, no surprise downloads.
// Dry-run is the default. An --apply opt-in is needed to change the host.
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const p=process.argv.slice(2),apply=p.includes('--apply');
const arg=p.find(x=>x.startsWith('--tool='))?.slice(7)||'';
const allowed={
  'qwen3-8b': {bin:'ollama',args:['pull','qwen3:8b'],hint:'Ollama must be installed, model size and RAM required'},
  'qwen35-9b': {bin:'ollama',args:['pull','qwen3.5:9b'],hint:'Verify tag/weight license and available memory on Ollama before pulling'},
  'qwen-coder': {bin:'ollama',args:['pull','qwen2.5-coder:7b'],hint:'Local code model, RAM required'},
  'bolt-diy': {bin:'git',args:['clone','--depth','1','https://github.com/stackblitz-labs/bolt.diy.git','bolt-diy'],hint:'After cloning run package installation separately; WebContainers terms apply',git:true},
  'cline': {bin:'git',args:['clone','--depth','1','https://github.com/cline/cline.git','cline'],hint:'Development source only; build and install dependencies separately',git:true},
  'opencode': {bin:'git',args:['clone','--depth','1','https://github.com/anomalyco/opencode.git','opencode'],hint:'Development source only; build independently',git:true},
  'trellis2': {bin:'git',args:['clone','--depth','1','https://github.com/microsoft/TRELLIS.2.git','trellis2'],hint:'Requires supported NVIDIA CUDA GPU; checkpoints and dependencies are separate',git:true},
  'godot': {bin:'git',args:['clone','--depth','1','https://github.com/godotengine/godot.git','godot-src'],hint:'Source only; compiling engine is separate',git:true},
  'comfyui': {bin:'git',args:['clone','--depth','1','https://github.com/comfyorg/ComfyUI.git','comfyui'],hint:'Must set up Python/Torch/CUDA and licensed checkpoint weights',git:true},
  'wan22': {bin:'git',args:['clone','--depth','1','https://github.com/Wan-Video/Wan2.2.git','wan22'],hint:'Source only, huge model weights and GPU not installed',git:true},
  'srs': {bin:'git',args:['clone','--depth','1','https://github.com/ossrs/srs.git','srs'],hint:'Source only; configure server and streaming independently',git:true},
  'owncast': {bin:'git',args:['clone','--depth','1','https://github.com/owncast/owncast.git','owncast'],hint:'Streaming server source only; Go/FFmpeg/runtime setup required',git:true}
};
if(!Object.hasOwn(allowed,arg)){console.error('Choose --tool='+Object.keys(allowed).join('|')+' [--apply]. Safe dry-run is the default.');process.exitCode=1;}
else{
  const t=allowed[arg];const dest=path.resolve('external-tools');
  console.log(`Tool: ${arg}\nCommand: ${t.bin} ${t.args.join(' ')}\nDetails: ${t.hint}\nMode: ${apply?'EXPLICIT APPLY':'DRY RUN / no changes'}`);
  if(apply){if(t.git)mkdirSync(dest,{recursive:true});const run=spawnSync(t.bin,t.args,{cwd:t.git?dest:process.cwd(),stdio:'inherit',shell:false,timeout:1800000});if(run.error){console.error('Failed:',run.error.message);process.exitCode=1;}else process.exitCode=run.status||0;}
}
