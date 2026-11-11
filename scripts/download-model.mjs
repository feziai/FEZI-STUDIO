// Explicit one-time model installer. Run locally then upload `models/` securely
// to a compatible Node.js host. Fails closed if download is incomplete.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream} from 'node:fs';
import {CATALOG,modelInfo,modelPath,MODEL_ROOT} from '../core/local-models.js';
const id=process.argv[2];
if(!id || id==='--help') {console.log('Usage: npm run model:download -- coder-mini|persian-mini|coder-plus');process.exit(0);}
const m=modelInfo(id); const url=`https://huggingface.co/${m.repo}/resolve/main/${m.file}`;
const dest=modelPath(id);const tmp=dest+'.download';
if(process.env.CONFIRM_MODEL_DOWNLOAD!=='yes')console.log(`Downloading ${m.name} (~${m.sizeMB} MB) from official Hugging Face repo. Set CONFIRM_MODEL_DOWNLOAD=yes to suppress this notice.`);
await fs.mkdir(MODEL_ROOT,{recursive:true});
if(await fs.stat(dest).catch(()=>null)){console.log('Already exists: '+dest);process.exit(0);}
const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),25*60*1000);
try{
 const res=await fetch(url,{signal:abort.signal,headers:{'user-agent':'FEZI-Studio/0.6 (personal selfhosted local-model installer)'}});
 if(!res.ok||!res.body)throw Error(`Download HTTP ${res.status}. Check network access and Hugging Face availability.`);
 const limit=Math.max(700,Number(m.sizeMB)*1.5)*1024*1024;
 const announced=Number(res.headers.get('content-length')||0);if(announced>limit)throw Error('Model exceeds expected size');
 let received=0;
 const body=Readable.fromWeb(res.body);
 body.on('data',c=>{received+=c.length;if(received>limit)abort.abort();});
 await pipeline(body,createWriteStream(tmp,{flags:'wx',mode:0o600}));
 const fh=await fs.open(tmp,'r');let magic=Buffer.alloc(4);try{await fh.read(magic,0,4,0);}finally{await fh.close();}
 if(received<5_000_000||magic.toString('ascii')!=='GGUF')throw Error('Downloaded file is not a valid GGUF file');
 await fs.rename(tmp,dest);
 console.log(`Installed ${id}: ${Math.round(received/1024/1024)} MiB at ${dest}`);
}catch(e){await fs.unlink(tmp).catch(()=>{});console.error(e.message);process.exitCode=1;}
finally{clearTimeout(timeout);}
