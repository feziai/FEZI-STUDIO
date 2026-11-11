/** FEZI AGENT remote static host adapter. Node.js 22, no npm dependencies.
 * Use on a separate hosting account, behind HTTPS reverse proxy.
 * Expects TARGET_WEBROOT (folder with per-site slug subdirs), DEPLOY_WEBHOOK_SECRET.
 * Never point TARGET_WEBROOT to your existing website root unless you intend that.
 */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const secret=process.env.DEPLOY_WEBHOOK_SECRET;
const root=process.env.TARGET_WEBROOT;
if(!secret||secret.length<20||!root){console.error('Set DEPLOY_WEBHOOK_SECRET and TARGET_WEBROOT');process.exit(1);}
const allowed = s => typeof s==='string'&&/^[a-z0-9][a-z0-9-]{0,34}$/.test(s)&&!s.endsWith('-');
const filename = s=>typeof s==='string'&&/^[\w./@()+ -]{1,150}$/.test(s)&&!s.startsWith('/')&&s.split('/').every(x=>x&&x!=='.'&&x!=='..'&&!x.startsWith('.'))&&/\.(html|css|js|mjs|json|txt|svg|xml|md)$/i.test(s);
const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/deploy'){res.writeHead(404).end();return;}
  try{
    const chunks=[];let size=0;
    for await(const x of req){size+=x.length;if(size>2_000_000)throw Error('Too large');chunks.push(x);}
    const raw=Buffer.concat(chunks),expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
    const got=(req.headers['x-fezi-signature']||'').replace(/^sha256=/,'');
    const a=Buffer.from(expected),b=Buffer.from(String(got));
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b)){res.writeHead(401).end('Invalid signature');return;}
    const body=JSON.parse(raw.toString('utf8'));const {slug,files}=body;
    if(!allowed(slug)||!files||typeof files!=='object'||Array.isArray(files)||!files['index.html'])throw Error('Invalid payload');
    const entries=Object.entries(files);
    if(entries.length>80||entries.some(([k,v])=>!filename(k)||typeof v!=='string'||Buffer.byteLength(v)>240000))throw Error('Unsupported files');
    await fs.mkdir(root,{recursive:true});
    const temp=path.join(root,'.fezi-new-'+crypto.randomBytes(8).toString('hex'));
    const current=path.join(root,slug);
    await fs.mkdir(temp);
    for(const [name,contents] of entries){const dest=path.join(temp,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,contents,'utf8');}
    let backup=null;
    try{await fs.access(current);const backups=path.resolve(root,'..','fezi-site-backups');await fs.mkdir(backups,{recursive:true});backup=path.join(backups,slug+'-'+Date.now());await fs.rename(current,backup);}catch(err){if(err.code!=='ENOENT')throw err;}
    try{await fs.rename(temp,current);}catch(err){if(backup)await fs.rename(backup,current);throw err;}
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({ok:true,site:slug,backupCreated:!!backup}));
  }catch(ex){console.error('Deployment failed:',ex.message);res.writeHead(400).end(JSON.stringify({error:ex.message}));}
});
server.listen(Number(process.env.ADAPTER_PORT||3100),process.env.ADAPTER_HOST||'127.0.0.1');
