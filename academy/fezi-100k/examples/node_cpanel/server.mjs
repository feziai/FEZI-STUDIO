/** FEZI Node 22/cPanel course example; local-only fixture. No secrets in responses. */
import http from 'node:http';
const MAX=4096;
export function createApp(){
 const records=[];
 return http.createServer((req,res)=>{
  const done=(status,obj)=>{const body=JSON.stringify(obj);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(body)};
  if(req.method==='GET'&&req.url==='/health')return done(200,{ok:true});
  if(req.method==='GET'&&req.url==='/api/tasks')return done(200,{tasks:records});
  if(req.method==='GET'&&req.url==='/api/info')return done(200,{app:'FEZI teaching fixture',runtime:'node',version:1});
  if(req.method==='POST'&&req.url==='/api/tasks'){
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return done(415,{error:'application/json required'});
   let chunks=[],size=0,closed=false;
   req.on('data',c=>{size+=c.length;if(size>MAX){closed=true;req.destroy();}else chunks.push(c)});
   req.on('end',()=>{if(closed)return;let v;try{v=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return done(400,{error:'bad json'})};
    if(!v||typeof v!=='object'||Array.isArray(v)||typeof v.title!=='string'||!v.title.trim()||v.title.length>120)return done(422,{error:'title required'});
    if(typeof v.hours!=='number'||!Number.isFinite(v.hours)||v.hours<0||v.hours>1000)return done(422,{error:'hours invalid'});
    if(records.length>=500)return done(429,{error:'fixture capacity reached'});
    const item={title:v.title.trim(),hours:v.hours};records.push(item);return done(201,{item});});return;
  }
  done(404,{error:'not found'});
 });
}
if(process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())){
 const port=Number(process.env.PORT||0),host='127.0.0.1';
 createApp().listen(port,host,function(){console.log(JSON.stringify({listening:true,port:this.address().port}))});
}
