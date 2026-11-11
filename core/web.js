/** Public, allowlisted web-inspection tool. Does not log in, defeat challenges, or run scripts. */
import dns from 'node:dns/promises';
import https from 'node:https';
import {isIP, BlockList} from 'node:net';
const reservedV6=new BlockList();
for(const [ip,mask] of [['2001::',32],['2001:10::',28],['2001:20::',28],['2001:db8::',32],['2002::',16],['3fff::',20]]) reservedV6.addSubnet(ip,mask,'ipv6');

export function allowedHost(raw){
  const host = String(raw||'').trim().toLowerCase().replace(/\.$/,'');
  const allow = (process.env.WEB_IMPORT_ALLOWED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  return allow.some(a=>a===host);
}
export function publicIp(ip){
  if(!isIP(ip))return false;
  if(ip.includes(':')) {
    const s=ip.toLowerCase();
    // Only permit standard public unicast 2000::/3; reject loopback, ULA, link-local, docs, mapped IPv4, and multicast.
    const first=Number.parseInt(s.split(':')[0],16);
    return first>=0x2000 && first<=0x3fff && !reservedV6.check(ip,'ipv6');
  }
  const [a,b,c]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0&&c===0||a===198&&b>=18&&b<=19||a===198&&b===51&&c===100||a===203&&b===0&&c===113||a===192&&b===0&&c===2||a===192&&b===88&&c===99||a===192&&b===0&&c===0||a===198&&b===19||a===192&&b===0&&c===0||a===255);
}
export async function checkPublicUrl(input){
  let url;try{url=new URL(input);}catch{throw Object.assign(new Error('Invalid website URL'),{status:400});}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!allowedHost(url.hostname))throw Object.assign(new Error('Website hostname must be explicitly allowed in WEB_IMPORT_ALLOWED_HOSTS and use HTTPS'),{status:403});
  const ips=await dns.lookup(url.hostname,{all:true,verbatim:true});
  if(!ips.length||ips.some(x=>!publicIp(x.address)))throw Object.assign(new Error('Website DNS contains a private or reserved IP'),{status:403});
  return url;
}
/** Fetch through a DNS-pinned HTTPS connection to avoid check-then-fetch DNS rebinding. */
export async function fetchPublic(input,{maxBytes=240000,contentTypes=['text/html','text/css','text/javascript','application/javascript','application/json','text/plain'],timeout=8000}={}) {
  let current=await checkPublicUrl(input);
  for(let redirects=0;redirects<3;redirects++){
    // The HTTPS socket resolves to one of the addresses checked immediately before connecting.
    const ips=await dns.lookup(current.hostname,{all:true,verbatim:true});
    if(!ips.length||ips.some(x=>!publicIp(x.address)))throw Object.assign(new Error('Remote hostname resolved to a reserved/private address'),{status:403});
    const selected=ips[0];
    const response=await new Promise((resolve,reject)=>{
      const request=https.request(current,{method:'GET',timeout,autoSelectFamily:false,family:selected.family,
        lookup:(_hostname,_options,cb)=>cb(null,selected.address,selected.family),
        headers:{'User-Agent':'FEZI-Studio-Import/0.7 (approved static snapshot)','Accept':'text/html,text/css,application/javascript,text/javascript,text/plain,application/json'}},remote=>{
          const status=remote.statusCode||0;
          const type=String(remote.headers['content-type']||'').split(';')[0].trim().toLowerCase();
          const rawLength=Number(remote.headers['content-length']||0);
          if(rawLength>maxBytes){remote.resume();request.destroy(Object.assign(new Error('Remote document too large'),{status:413}));return;}
          const chunks=[];let total=0;
          remote.on('data',chunk=>{total+=chunk.length;if(total>maxBytes)request.destroy(Object.assign(new Error('Remote document too large'),{status:413}));else chunks.push(chunk);});
          remote.once('end',()=>resolve({status,type,headers:remote.headers,body:Buffer.concat(chunks).toString('utf8')}));
          remote.once('error',reject);
        });
      request.once('error',reject);
      request.once('timeout',()=>request.destroy(Object.assign(new Error('Remote request timed out'),{status:504})));
      request.end();
    });
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.location;
      if(typeof location!=='string')throw Object.assign(new Error('Redirect missing location'),{status:502});
      current=await checkPublicUrl(new URL(location,current).href);
      continue;
    }
    if(response.status<200||response.status>=300)throw Object.assign(new Error('Public page returned HTTP '+response.status),{status:502});
    if(!contentTypes.includes(response.type))throw Object.assign(new Error('Unsupported remote content-type: '+response.type),{status:415});
    return {url:current.href,type:response.type,body:response.body};
  }
  throw Object.assign(new Error('Too many remote redirects'),{status:400});
}
/** Import one public/static page. Absolute URLs and external assets are deliberately left intact. */
export async function inspectPublicWebsite(input){
  const page=await fetchPublic(input);
  const title=page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g,'').trim().slice(0,140)||'(untitled)';
  const stylePaths=[...page.body.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi)].map(x=>x[1]).slice(0,10);
  const scriptPaths=[...page.body.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(x=>x[1]).slice(0,10);
  return {source:page.url,title,html:page.body,assets:{styles:stylePaths,scripts:scriptPaths},limitations:['Static HTML only; does not execute JavaScript or extract backend/databases','Links to remote assets may require the source site','No access to gated/private pages without an authorized export']};
}
export async function importPublicWebsite(input){
  const result=await inspectPublicWebsite(input);
  // Preserve base URL so relative resources still resolve against the original domain.
  let html=result.html;
  const baseTag='<base href="'+result.source.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">';
  html=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,x=>x+'\n'+baseTag):'<!doctype html><head>'+baseTag+'</head>'+html;
  const notes=`Snapshot captured from ${result.source} at ${new Date().toISOString()}\n\nThis is a public HTML snapshot, not the original source code. JavaScript apps, server logic, databases and gated content cannot be reconstructed from a webpage.\n\nExternal images, CSS and JS remain linked to the source website. If you own the source, import your repository or a legitimate export for a complete copy.\n`;
  return {files:[{path:'index.html',content:html},{path:'IMPORT_NOTES.txt',content:notes}],summary:{url:result.source,title:result.title,limitations:result.limitations}};
}
