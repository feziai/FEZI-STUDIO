/** Authenticated, size-limited media attachments for the public shared Arina room.
 * Files are stored outside public/, never forwarded to AI providers automatically.
 */
import {randomUUID} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export const ARINA_MAX_FILE=50*1024*1024;
const allowed=new Map([
  ['image/jpeg',['.jpg','.jpeg',12]],['image/png',['.png',12]],['image/webp',['.webp',12]],['image/gif',['.gif',12]],['image/avif',['.avif',12]],['image/heic',['.heic',12]],['image/heif',['.heif',12]],
  ['video/mp4',['.mp4','.m4v',50]],['video/webm',['.webm',50]],['video/quicktime',['.mov',50]],
  ['audio/webm',['.webm',20]],['audio/mp4',['.m4a','.mp4',20]],['audio/ogg',['.ogg',20]],
  ['audio/mpeg',['.mp3',20]],['audio/wav',['.wav',20]],
  ['application/pdf',['.pdf',15]],['text/plain',['.txt','.log','.md','.csv',10]],
  ['application/json',['.json',10]],['text/csv',['.csv',10]],['application/zip',['.zip',15]],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',['.docx',15]]
]);
const httpError=(s,m)=>Object.assign(new Error(m),{status:s});
function signatureOkay(bytes,type){
 const str=bytes.toString('latin1'),first=bytes.subarray(0,12);
 if(type==='image/jpeg')return bytes[0]===0xff&&bytes[1]===0xd8;
 if(type==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(type==='image/webp')return str.startsWith('RIFF')&&str.slice(8,12)==='WEBP';
 if(type==='image/gif')return str.startsWith('GIF8');
 if(['image/avif','image/heic','image/heif'].includes(type)){const brand=first.subarray(8,12).toString('latin1');return first.subarray(4,8).toString()==='ftyp'&&(type==='image/avif'?brand==='avif'||brand==='avis':['heic','heix','hevc','hevx','mif1'].includes(brand))}
 if(type==='video/mp4'||type==='video/quicktime'||type==='audio/mp4')return first.subarray(4,8).toString()==='ftyp';
 if(type==='video/webm'||type==='audio/webm')return first.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(type==='audio/ogg')return str.startsWith('OggS');
 if(type==='audio/wav')return str.startsWith('RIFF')&&str.slice(8,12)==='WAVE';
 if(type==='audio/mpeg')return str.startsWith('ID3')||(bytes[0]===255&&(bytes[1]&224)===224);
 if(type==='application/pdf')return str.startsWith('%PDF-');
 if(type==='application/zip'||type.endsWith('wordprocessingml.document'))return str.startsWith('PK\x03\x04');
 if(type==='text/plain'||type==='text/csv'||type==='application/json')return !bytes.includes(0) && !bytes.subarray(0,256).some(c=>c<9||(c>13&&c<32));
 return false;
}
export function validateAttachmentName(name,type){
 const opts=allowed.get(String(type).toLowerCase());if(!opts)throw httpError(415,'Unsupported file type');
 const clean=String(name||'upload').replace(/[\\/<>"\x00-\x1f]/g,'_').slice(0,110).trim()||'upload';
 if(!opts.slice(0,-1).includes(path.extname(clean).toLowerCase()))throw httpError(415,'File extension and media type differ');
 return {clean,type:String(type).toLowerCase(),maxBytes:opts.at(-1)*1024*1024};
}
export function createArinaAttachments({root,now=()=>Date.now()}={}){
 if(!root)throw Error('Upload root is required');
 const ttlMs=7*24*3600*1000;
 const dataFile=id=>path.join(root,id+'.bin');const metaFile=id=>path.join(root,id+'.json');
 async function upload(req,{filename,type,owner}){
  const {clean,maxBytes}=validateAttachmentName(filename,type);
  if(!/^[a-f0-9]{32}$/.test(owner))throw httpError(401,'Missing session');
  const id=randomUUID().replaceAll('-','');await fs.mkdir(root,{recursive:true,mode:0o700});
  const storage=dataFile(id),writer=createWriteStream(storage,{flags:'wx',mode:0o600});let size=0,header=Buffer.alloc(0);
  try{
   for await(const chunk of req){size+=chunk.length;if(size>maxBytes)throw httpError(413,'File too large');
    if(header.length<512)header=Buffer.concat([header,chunk.subarray(0,512-header.length)]);
    if(!writer.write(chunk))await new Promise((resolve,reject)=>{writer.once('drain',resolve);writer.once('error',reject)});
   }
   if(size===0||!signatureOkay(header,type))throw httpError(415,'Media header does not match file type');
   writer.end();await new Promise((resolve,reject)=>{writer.once('finish',resolve);writer.once('error',reject)});
   const meta={id,name:clean,type,size,owner,createdAt:now(),expiresAt:now()+ttlMs};
   await fs.writeFile(metaFile(id),JSON.stringify(meta),{flag:'wx',mode:0o600});return publicInfo(meta);
  }catch(e){writer.destroy();await fs.rm(storage,{force:true}).catch(()=>{});throw e;}
 }
 const publicInfo=m=>({id:m.id,name:m.name,type:m.type,size:m.size,url:'/api/arina/attachments/'+m.id,expiresAt:m.expiresAt});
 async function get(id){if(!/^[a-f0-9]{32}$/.test(String(id)))throw httpError(404,'Attachment not found');
  let meta;try{meta=JSON.parse(await fs.readFile(metaFile(id),'utf8'))}catch{throw httpError(404,'Attachment not found')}
  if(meta.expiresAt<now()){await Promise.all([fs.rm(metaFile(id),{force:true}),fs.rm(dataFile(id),{force:true})]);throw httpError(410,'Attachment expired')}
  return {...meta,path:dataFile(id)};
 }
 async function resolve(ids,owner){if(!Array.isArray(ids)||ids.length>6||new Set(ids).size!==ids.length)throw httpError(400,'Invalid attachment selection');
  const result=[];for(const id of ids){const m=await get(id);if(m.owner!==owner)throw httpError(403,'Attachment belongs to a different session');result.push(publicInfo(m))}return result;
 }
 return {upload,get,resolve,publicInfo};
}
