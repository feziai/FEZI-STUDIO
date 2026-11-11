import rawTools from '../config/fezi-toolbox.json' with {type:'json'};
import {access,constants as fsConstants} from 'node:fs/promises';
import path from 'node:path';

// Catalog != installed. Never report a licensed model as downloaded simply because it is listed.
export const TOOLBOX = Object.freeze(rawTools.map(t=>Object.freeze({...t, installed:false})));
export const CATEGORIES = Object.freeze([
  ['all','همه'],['3d','مدل سه‌بعدی'],['game','بازی‌سازی'],['app','وب‌اپ و اپلیکیشن'],
  ['code','کدنویسی'],['text','متن و زبان'],['prompt','پرامپت‌نویسی'],
  ['image','تصویر'],['video','ویدیوساز'],['video-edit','تدوین ویدیو'],
  ['stream','پخش زنده ۲۴ساعته'],['security','امنیت و آنتی‌ویروس'],['optional','اختیاری و پولی']
].map(([id,name])=>Object.freeze({id,name})));

export function listToolbox({category='all',search='',mode=''}={}) {
  const key=String(search||'').trim().toLowerCase().slice(0,120);
  return TOOLBOX.filter(t=>(category==='all'||t.category===category) && (!mode||t.connection===mode)
    && (!key||[t.name,t.summary,t.category].join(' ').toLowerCase().includes(key)));
}
async function executablePresent(binary,env=process.env){
  if(!/^[a-z][a-z0-9_.-]{0,45}$/i.test(binary))return false;
  for (const dir of String(env.PATH||'').split(path.delimiter).filter(Boolean)) {
    try{await access(path.join(dir,binary),fsConstants.X_OK);return true;}catch{}
  }return false;
}
const BINARIES=['node','npm','git','python3','ffmpeg','ffprobe','ollama','blender','godot','cline','opencode','aider','goose','codex','trivy','gitleaks','clamscan','semgrep','osv-scanner','yara','obs','mediamtx'];
export async function toolboxHostDoctor({env=process.env}={}) {
  const checks=await Promise.all(BINARIES.map(async command=>[command,await executablePresent(command,env)]));
  const available=Object.fromEntries(checks);
  return {checkedAt:new Date().toISOString(),hostRuntime:{nodeVersion:process.version,platform:process.platform,architecture:process.arch},
    available, installedToolIds:TOOLBOX.filter(t=>t.command&&available[t.command]).map(t=>t.id),
    llmConfigured:!!env.OLLAMA_BASE_URL,
    gpuWorkerConfigured:!!env.FEZI_GPU_WORKER_URL,
    llmReady:false,gpuModelWeightsVerified:false,
    note:'Executable presence is only a PATH check; model weights, accelerator readiness, deployment and software operation are NOT verified.'};
}
export function toolboxSummary(){return {total:TOOLBOX.length,categories:CATEGORIES,installation:'optional-on-separate-machines',onDemandGPU:true,notBundled:true};}
