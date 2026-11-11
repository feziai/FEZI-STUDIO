/** FEZI GeneratePrompt.net official-owner import adapter.
 * Reads approved owner exports (JSON) or public HTML archives; optionally crawls
 * only GeneratePrompt.net over HTTPS from an owner-controlled deployment.
 * No external packages, no training tasks, no credential collection.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createReadStream} from 'node:fs';
import {createGunzip} from 'node:zlib';
import readline from 'node:readline';
const ORIGIN='https://generateprompt.net';
const HOSTS=new Set(['generateprompt.net','www.generateprompt.net']);
const MEDIA_HOSTS=new Set(['generateprompt.net','www.generateprompt.net','res-a.generateprompt.net','res-b.generateprompt.net','res-c.generateprompt.net']);
const TYPES=['image','video','website','text'];
export const LIBRARIES=['/image-prompts','/video-prompts','/website-prompts','/text-prompts','/prompts/flux-prompts','/prompts/gpt-image-prompts','/prompts/midjourney-prompts','/prompts/nano-banana-prompts','/prompts/seedream-prompts','/prompts/z-image-prompts','/prompts/world-cup-2026-prompts'];
const decode=s=>String(s||'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/gi,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ', '#39':"'"}[n]));
const strip=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<(br|hr)\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|section|article|h[1-6]|li|pre|blockquote)>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
function attr(t,k){return decode(t.match(new RegExp('\\b'+k+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'))?.slice(1).find(x=>x!==undefined)||'')}
function meta(html,key){const tags=html.match(/<meta\s+[^>]*>/gi)||[];for(const t of tags)if((attr(t,'property')||attr(t,'name')).toLowerCase()===key.toLowerCase())return attr(t,'content');return ''}
function slugify(s){return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,54)||'prompt'}
function validSource(u){try{const x=new URL(u);return x.protocol==='https:'&&HOSTS.has(x.hostname)&&!x.username&&!x.password&&!x.port}catch{return false}}
function sourcePath(url){try{const x=new URL(url);return x.pathname}catch{return ''}}
export function isPromptDetail(u){return validSource(u)&&/^\/(?:image-prompts|video-prompts|website-prompts|text-prompts)\/[^/]+\/?$/.test(sourcePath(u))}
function categoryFrom(pathname,kind,html=''){const list=strip(html.match(/<(?:aside|section)\b[^>]*class=["'][^"']*(?:tags|categories)[^"']*["'][^>]*>[\s\S]*?<\/(?:aside|section)>/i)?.[0]||'');const tags=list.split(/\n|,|\s{3,}/).map(x=>x.trim()).filter(Boolean);if(kind==='website')return 'Website';if(kind==='text')return 'Writing';const s=(pathname+' '+tags.join(' ')).toLowerCase();for(const [re,label] of [[/fashion|streetwear|couture|editorial/, 'Fashion'],[/portrait|face|selfie/, 'Portrait'],[/product|advert|commercial|branding/, 'Advertising'],[/anime|manga/, 'Anime'],[/food|drink|dessert/, 'Food'],[/landscape|nature|travel/, 'Nature'],[/cinematic|movie|film/, 'Cinematic'],[/character|3d|animation/, '3D & Character']])if(re.test(s))return label;return kind==='video'?'Video':'Image';}
function mediaFrom(html,url){const arr=[];const add=(type,x,alt='')=>{if(!x)return;try{const u=new URL(x,url);if(u.protocol!=='https:'||!MEDIA_HOSTS.has(u.hostname))return;const val=u.href;if(!arr.some(y=>y.url===val))arr.push({type,url:val,alt:alt||'GeneratePrompt preview',transferAllowed:true})}catch{}};
 for(const [p,type] of [['og:image','image'],['twitter:image','image'],['og:video','video'],['twitter:player:stream','video']])add(type,meta(html,p));
 for(const tag of html.match(/<(?:img|source|video|a)\b[^>]*>/gi)||[]){const type=/^<video\b|\btype=["']video\//i.test(tag)||/\.(mp4|webm)(\?|$)/i.test(attr(tag,'src'))?'video':'image';add(type,attr(tag,'src')||attr(tag,'data-src')||attr(tag,'poster')||((/^<a\b/i.test(tag)&&/\.(?:png|webp|jpg|jpeg|gif|mp4|webm)(?:\?|$)/i.test(attr(tag,'href')))?attr(tag,'href'):''),attr(tag,'alt'))}
 return arr.slice(0,12);}
function extractPrompt(html){ // Strong delimiters first; incomplete/hidden text is never treated as full prompt.
 for(const rex of [/<(?:pre|textarea)\b[^>]*(?:id|class)=["'][^"']*prompt[^"']*["'][^>]*>([\s\S]*?)<\/(?:pre|textarea)>/i,/<h[2-4]\b[^>]*>\s*Prompt\s*<\/h[2-4]>[\s\S]{0,500}?<(?:pre|div|p|section)\b[^>]*>([\s\S]*?)<\/(?:pre|div|p|section)>/i]){const m=html.match(rex);if(m){const t=strip(m[1]);if(t.length>=35&&!/^copy(?:\s+prompt)?$/i.test(t))return t;}}
 const text=strip(html);const m=text.match(/(?:^|\n)Prompt\n(?:Copy\n)?([\s\S]*?)(?:\n(?:Use this prompt|Use as reference|Copy Prompt|Similar Prompts|Related Prompts|Login|Sign in)\b|$)/i);if(m&&m[1].trim().length>=40)return m[1].trim();return '';
}
export function parseGeneratePromptHtml(html,url){if(!isPromptDetail(url))return {status:'skipped',reason:'not_detail_url',url};const kind=sourcePath(url).split('/')[1].replace(/-prompts$/, '');let title=strip(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);if(!title)title=meta(html,'og:title').replace(/\s*\|.*$/,'');if(!title)return {status:'skipped',reason:'missing_title',url};const prompt=extractPrompt(html);if(!prompt)return {status:'skipped',reason:'prompt_not_public_in_html',url,title};const txt=strip(html);const media=mediaFrom(html,url);const description=meta(html,'description')||meta(html,'og:description')||'';
 const base=sourcePath(url).split('/').pop();const slug='gp-'+slugify(title)+'-'+crypto.createHash('sha256').update(url).digest('hex').slice(0,9);
 return {status:'ready',record:{slug,title,description:description.slice(0,300),category:categoryFrom(sourcePath(url),kind,html),kind:kind==='text'?'writing':kind==='website'?'code':kind,model:'',prompt,media,sourceId:'generateprompt',sourceUrl:url,rights:'owner_attested',transferAllowed:true,copyAllowed:true,importedAt:new Date().toISOString(),tags:[kind],externalId:base}};
}
export function normalizeOwnerRecord(raw){if(!raw||typeof raw!=='object')return null;const sourceUrl=String(raw.sourceUrl||raw.url||raw.link||'');if(!validSource(sourceUrl))return null;const type=String(raw.kind||raw.type||raw.mediaType||'').toLowerCase();const pathname=sourcePath(sourceUrl);const k=type||pathname.split('/')[1];const kind=k.includes('video')?'video':k.includes('web')||k==='code'?'code':k.includes('text')||k.includes('writ')?'writing':'image';const title=String(raw.title||raw.name||'').trim(),prompt=String(raw.prompt||raw.promptText||raw.fullPrompt||raw.content||'').trim();if(title.length<3||prompt.length<10)return null;const media=Array.isArray(raw.media)?raw.media:Array.isArray(raw.images)?raw.images.map(x=>typeof x==='string'?{type:'image',url:x}:x):[...([raw.thumbnail||raw.cover||raw.image||raw.previewImage].filter(Boolean).map(x=>({type:'image',url:x}))),...(Array.isArray(raw.videos)?raw.videos.map(x=>typeof x==='string'?{type:'video',url:x}:x):[])];
 const assets=media.map(x=>{let url=String(typeof x==='string'?x:x.url||x.src||'');try{url=new URL(url,sourceUrl).href;const u=new URL(url);if(u.protocol!=='https:'||!MEDIA_HOSTS.has(u.hostname))return null;}catch{return null;}return {type:(x.type==='video'||/\.(mp4|webm)(?:\?|$)/i.test(url))?'video':'image',url,alt:String(x.alt||title).slice(0,140),transferAllowed:true}}).filter(Boolean).slice(0,12);
 const slug='gp-'+slugify(title)+'-'+crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0,9);
 return {slug,title,titleFa:String(raw.titleFa||''),description:String(raw.description||'').slice(0,300),category:String(raw.category||categoryFrom(pathname,kind)).slice(0,45),kind,prompt,media:assets,sourceId:'generateprompt',sourceUrl,rights:'owner_attested',transferAllowed:true,copyAllowed:true,importedAt:new Date().toISOString(),tags:Array.isArray(raw.tags)?raw.tags.slice(0,12):[]};}
export function extractHtmlLinks(html,url){const out=[];const re=/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;let m;while((m=re.exec(html))){try{const u=new URL(decode(m[1]),url);if(validSource(u.href))out.push(u.href.split('#')[0]);}catch{}}return [...new Set(out)]}
export function extractSitemapUrls(xml){return [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(m=>decode(m[1].trim())).filter(validSource)}
async function safeFetch(url,fetchImpl=fetch){if(!validSource(url))throw Error('Unsupported fetch host');let current=url;for(let i=0;i<4;i++){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);let res;try{res=await fetchImpl(current,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'FEZI Studio Owner Migration/1.0 (+https://generateprompt.net)','accept':'text/html, application/xml, text/xml'}});}finally{clearTimeout(timer)}if([301,302,303,307,308].includes(res.status)){const next=new URL(res.headers.get('location')||'',current).href;if(!validSource(next))throw Error('Redirect outside owner domain');current=next;continue;}if(!res.ok)throw Error('HTTP '+res.status);const size=Number(res.headers.get('content-length')||0);if(size>5_000_000)throw Error('Page over 5MB');const html=await res.text();if(html.length>5_000_000)throw Error('Page over 5MB');return html;}throw Error('Too many redirects')}
export async function discoverGeneratePromptPages({fetchPage=safeFetch,maxListing=250,maxPages=30000,onError=()=>{}}={}){
 const seen=new Set(),queue=[...LIBRARIES.map(x=>ORIGIN+x),ORIGIN+'/sitemap.xml',ORIGIN+'/sitemap_index.xml',ORIGIN+'/robots.txt'];const details=new Set();let crawled=0,sitemaps=0;
 for(let i=0;i<queue.length&&crawled<maxListing&&details.size<maxPages;i++){const u=queue[i];if(seen.has(u))continue;seen.add(u);if(isPromptDetail(u)){details.add(u);continue}try{const html=await fetchPage(u);crawled++;
 if(/<urlset|<sitemapindex/i.test(html)){sitemaps++;for(const v of extractSitemapUrls(html)){if(isPromptDetail(v))details.add(v);else if(/\.xml(?:\?|$)/i.test(v)&&!seen.has(v)&&queue.length<maxPages+maxListing)queue.push(v)}}
 else if(u.endsWith('/robots.txt')){for(const m of html.matchAll(/^\s*Sitemap:\s*(https:\/\/\S+)/gmi)){if(validSource(m[1])&&!seen.has(m[1]))queue.push(m[1])}}
 else {for(const v of extractHtmlLinks(html,u)){if(isPromptDetail(v))details.add(v);else if((/\/prompts\/|[?&]page=\d+/.test(v))&&!seen.has(v)&&queue.length<maxPages+maxListing)queue.push(v)}}
 }catch(e){onError(u,e)}
 }return {urls:[...details].sort(),listingChecked:crawled,sitemapsChecked:sitemaps,queueSeen:seen.size};}
export async function readOwnerExport(file){
 // NDJSON streams line-by-line; optional gzip reduces pressure for owner archives.
 const ndjson=/\.(jsonl|ndjson)(?:\.gz)?$/i.test(file);
 if(ndjson){
  const stream=createReadStream(file).pipe(/\.gz$/i.test(file)?createGunzip():new (await import('node:stream')).PassThrough());
  const lines=readline.createInterface({input:stream,crlfDelay:Infinity});
  const rows=[];let line=0;
  for await(const raw of lines){line++;if(!raw.trim())continue;if(line>1_000_000)throw Error('Archive record limit exceeded');
   let value;try{value=JSON.parse(raw)}catch{throw Error('Invalid JSONL at line '+line)};
   const entry=normalizeOwnerRecord(value);if(entry)rows.push(entry);
  }
  return rows;
 }
 const data=/\.gz$/i.test(file)?await new Promise((resolve,reject)=>{const chunks=[];createReadStream(file).pipe(createGunzip()).on('data',c=>chunks.push(c)).on('end',()=>resolve(Buffer.concat(chunks))).on('error',reject)}):await fs.readFile(file);
 const raw=JSON.parse(data.toString('utf8'));
 const arr=Array.isArray(raw)?raw:Array.isArray(raw.records)?raw.records:Array.isArray(raw.prompts)?raw.prompts:null;
 if(!arr)throw Error('Expected JSON array, {records:[...]}, {prompts:[...]} or JSONL/NDJSON');
 return arr.map(normalizeOwnerRecord).filter(Boolean);
}
export async function readHtmlArchive(folder){const all=[];async function walk(dir){for(const d of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,d.name);if(d.isDirectory())await walk(file);else if(/\.html?$/i.test(d.name)){const text=await fs.readFile(file,'utf8');const url=text.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1]||text.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)/i)?.[1];if(url){const result=parseGeneratePromptHtml(text,url);if(result.status==='ready')all.push(result.record)}}}}await walk(folder);return all;}
export async function mergeGeneratePromptRecords({dataDir,records,dryRun=true}){const file=path.join(dataDir,'prompts-v16','imported.json');let existing=[];try{existing=JSON.parse(await fs.readFile(file,'utf8'));if(!Array.isArray(existing))throw Error('invalid database')}catch(e){if(e.code!=='ENOENT')throw e}const keys=new Set(existing.map(x=>x.sourceUrl).filter(Boolean)),slugs=new Set(existing.map(x=>x.slug));const accepted=[];let skipped=0;for(const r of records){if(!r||r.sourceId!=='generateprompt'||!r.prompt||!r.title||!validSource(r.sourceUrl)||keys.has(r.sourceUrl)||slugs.has(r.slug)){skipped++;continue}keys.add(r.sourceUrl);slugs.add(r.slug);accepted.push(r)}if(!dryRun&&accepted.length){await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const tmp=file+'.gp-'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify([...existing,...accepted],null,2),{mode:0o600});await fs.rename(tmp,file)}return {previous:existing.length,added:accepted.length,duplicatesOrInvalid:skipped,total:existing.length+accepted.length,committed:!dryRun,storeFile:file}}
