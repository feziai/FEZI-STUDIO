import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import net from 'node:net';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),secret='internal-telegram-test-secret-1234567890123';
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n}
async function call(base,route,{method='GET',body,cookie,internal}={}){const r=await fetch(base+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(internal?{'x-fezi-bot-secret':internal}:{})},body:body?JSON.stringify(body):undefined});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data=raw}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
function captchaAnswer(b){const svg=Buffer.from(b.image.split(',')[1],'base64').toString();return [...svg.matchAll(/<text x="\d+" y="\d+"[^>]*>([A-Z0-9])<\/text>/g)].map(x=>x[1]).join('')}
test('real HTTP link -> bot confirmation -> verified Telegram login -> user session',async t=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'fezi-telegram-live-')),p=await port(),base='http://127.0.0.1:'+p;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(p),HOST:'127.0.0.1',DATA_DIR:data,APP_PASSWORD:'test-owner-password-very-long',SESSION_SECRET:'fezi-server-authentication-test-secret-123456',TELEGRAM_INTERNAL_TOKEN:secret,TELEGRAM_LOGIN_BOT_USERNAME:'FEZI_Login_Bot',TELEGRAM_FEZI_BOT_USERNAME:'FEZI_Studio_Bot',PUBLIC_BASE_URL:'https://fezi.example'},stdio:'ignore'});
 t.after(async()=>{child.kill('SIGTERM');await rm(data,{recursive:true,force:true})});let up=false;for(let i=0;i<90;i++){try{up=(await fetch(base+'/health')).ok;if(up)break}catch{}await new Promise(r=>setTimeout(r,55))}assert.ok(up,'server startup');
 assert.equal((await call(base,'/telegram-connect')).status,200);
 assert.equal((await call(base,'/api/telegram/link/start',{method:'POST',body:{}})).status,401);
 const c=await call(base,'/api/auth/captcha'),a=captchaAnswer(c.data);assert.equal(a.length,6);
 const r=await call(base,'/api/account/register',{method:'POST',body:{name:'Telegram Tester',username:'tele_test',password:'PasswordPass1234',agreeTerms:true,captchaToken:c.data.token,captchaAnswer:a}});assert.equal(r.status,201,JSON.stringify(r.data));
 const link=await call(base,'/api/telegram/link/start',{method:'POST',body:{},cookie:r.cookie});assert.equal(link.status,200);
 assert.equal((await call(base,'/api/telegram/internal/confirm',{method:'POST',body:{kind:'link',code:link.data.code,telegramId:'777123'}})).status,401);
 const confirmed=await call(base,'/api/telegram/internal/confirm',{method:'POST',internal:secret,body:{kind:'link',code:link.data.code,telegramId:'777123'}});assert.equal(confirmed.status,200,JSON.stringify(confirmed.data));
 const summary=await call(base,'/api/telegram/internal/summary',{method:'POST',internal:secret,body:{telegramId:'777123'}});assert.equal(summary.data.linked,true);assert.equal(summary.data.username,'tele_test');assert.equal(summary.data.arina.balanceCents,0);
 const started=await call(base,'/api/telegram/login/start',{method:'POST',body:{}});assert.equal(started.status,200);assert.ok(started.data.deepLink.startsWith('https://t.me/FEZI_Login_Bot?start=login_'));
 const notYet=await call(base,'/api/telegram/login/finish',{method:'POST',body:{code:started.data.code,browserSecret:started.data.browserSecret}});assert.equal(notYet.status,403);
 const confirm=await call(base,'/api/telegram/internal/confirm',{method:'POST',internal:secret,body:{kind:'login',code:started.data.code,telegramId:'777123'}});assert.equal(confirm.status,200);
 const bad=await call(base,'/api/telegram/login/finish',{method:'POST',body:{code:started.data.code,browserSecret:'wrong'}});assert.equal(bad.status,403);
 const finished=await call(base,'/api/telegram/login/finish',{method:'POST',body:{code:started.data.code,browserSecret:started.data.browserSecret}});assert.equal(finished.status,200,JSON.stringify(finished.data));assert.ok(finished.cookie.startsWith('fezi_user='));
 const me=await call(base,'/api/account/me',{cookie:finished.cookie});assert.equal(me.data.user.username,'tele_test');
 assert.equal((await call(base,'/api/telegram/login/finish',{method:'POST',body:{code:started.data.code,browserSecret:started.data.browserSecret}})).status,403);
 const share=await call(base,'/api/telegram/share-options',{cookie:finished.cookie});assert.equal(share.status,200);assert.equal(share.data.posts.length,0);assert.ok(share.data.profile.url.endsWith('/u/tele_test'));
});
