import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function ready(url){for(let i=0;i<90;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,70))}throw Error('FEZI server did not become ready')}
async function call(url,route,{method='GET',body,cookie}={}){const r=await fetch(url+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,body:data,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
function solveCaptcha(b){const svg=Buffer.from(b.image.split(',')[1],'base64').toString();const letters=[...svg.matchAll(/<text x="\d+" y="\d+"[^>]*>([A-Z0-9])<\/text>/g)].map(x=>x[1]).join('');assert.equal(letters.length,6);return letters}

test('v1.01 real HTTP: CAPTCHA, accounts, creator profiles, moderation, quotes, languages & registry',async t=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'fezi-v101-full-'));const port=await freePort(),url='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,APP_PASSWORD:'v101-owner-pass-very-long',SESSION_SECRET:'secret-for-fezi-v101-local-tests-1111111111111111',DATA_DIR:data,PORT:String(port),HOST:'127.0.0.1',CAPTCHA_REQUIRED:'true',ARINA_AI_ENABLED:'false',ARINA_DEMO_MODE:'false'},stdio:['ignore','pipe','pipe']});let log='';child.stderr.on('data',x=>log+=x.toString());t.after(async()=>{child.kill('SIGTERM');await rm(data,{recursive:true,force:true})});try{await ready(url)}catch(e){throw Error(e.message+' '+log.slice(-1200))}
 const paths=['/','/studio','/marketplace','/opensource','/lang/en/website-builder','/lang/fa/telegram-bot','/sitemap-i18n.xml'];for(const p of paths){const r=await call(url,p);assert.equal(r.status,200,p)}
 const locales=await call(url,'/api/i18n/locales');assert.equal(locales.body.translatedServices,56);assert.equal(locales.body.locales.length,8);
 const tools=await call(url,'/api/opensource?priority=P0');assert.equal(tools.body.total,30);assert.equal(tools.body.installedVerified,0);
 const denied=await call(url,'/api/admin/dashboard-v101');assert.equal(denied.status,401);
 const cap=await call(url,'/api/auth/captcha');assert.equal(cap.status,200);const solution=solveCaptcha(cap.body);assert.equal(cap.body.length,6);assert.equal(cap.body.token.includes(solution),false);
 const signup={name:'Test Creator',username:'creator_new',email:'creator@example.com',password:'SecurePassword12030',agreeTerms:true,captchaToken:cap.body.token,captchaAnswer:solution};
 const register=await call(url,'/api/account/register',{method:'POST',body:signup});assert.equal(register.status,201,JSON.stringify(register.body));assert.equal(register.body.user.username,'creator_new');const creatorCookie=register.cookie;
 const reuse=await call(url,'/api/account/register',{method:'POST',body:signup});assert.notEqual(reuse.status,201,'CAPTCHA one-time only');
 const avail=await call(url,'/api/account/username/check?username=creator_new');assert.equal(avail.body.available,false);
 const publicProfile=await call(url,'/u/creator_new');assert.equal(publicProfile.status,200);assert.ok(publicProfile.body.includes('@creator_new'));assert.ok(!publicProfile.body.includes('creator@example.com'),'private email not exposed');
 const login=await call(url,'/api/account/login',{method:'POST',body:{identifier:'creator_new',password:signup.password}});assert.equal(login.status,200);assert.ok(login.cookie);
 const wallet=await call(url,'/api/creator/wallet',{method:'POST',cookie:creatorCookie,body:{asset:'USDT_TRC20',address:'TWCLiDUumxSegdbY2Qq6n25PaoGuDedovp'}});assert.equal(wallet.status,200,JSON.stringify(wallet.body));
 const badWallet=await call(url,'/api/creator/wallet',{method:'POST',cookie:creatorCookie,body:{asset:'BTC',address:'test'}});assert.equal(badWallet.status,422);
 const product=await call(url,'/api/marketplace/listings',{method:'POST',cookie:creatorCookie,body:{title:'Original portrait prompt',description:'Original cinematic portrait prompt with daylight and studio lighting, created by the owner.',category:'prompt',priceUsd:10,rightsConfirmed:true,file:{ext:'.txt',base64:Buffer.from('A private original long prompt for license holders only.').toString('base64')}}});assert.equal(product.status,202,JSON.stringify(product.body));assert.equal(product.body.listing.platformFeeCents,50);assert.equal(product.body.listing.creatorPayoutCents,950);const listingId=product.body.listing.id;
 const prePublic=await call(url,'/api/marketplace/listings');assert.equal(prePublic.body.listings.length,0,'pending listing must not leak');
 const adminLogin=await call(url,'/api/login',{method:'POST',body:{password:'v101-owner-pass-very-long'}});assert.equal(adminLogin.status,200);const adminCookie=adminLogin.cookie;
 const dashboard=await call(url,'/api/admin/dashboard-v101',{cookie:adminCookie});assert.equal(dashboard.body.pending,1);assert.equal(dashboard.body.ordersSettled,0);
 const previewDenied=await call(url,'/api/admin/marketplace/preview/'+listingId);assert.equal(previewDenied.status,401);
 const previewAllowed=await call(url,'/api/admin/marketplace/preview/'+listingId,{cookie:adminCookie});assert.equal(previewAllowed.status,200);assert.ok(String(previewAllowed.body).includes('private original'));
 const approval=await call(url,'/api/admin/marketplace/review',{method:'POST',cookie:adminCookie,body:{id:listingId,action:'approve'}});assert.equal(approval.status,200);assert.equal(approval.body.status,'approved');
 const listed=await call(url,'/api/marketplace/listings');assert.equal(listed.body.listings.length,1);assert.equal(listed.body.listings[0].hasPrivateFile,true);assert.ok(!JSON.stringify(listed.body).includes('private original'));
 const buyerCaptcha=await call(url,'/api/auth/captcha');const buyerSignup=await call(url,'/api/account/register',{method:'POST',body:{name:'Buyer',username:'buyer_test',password:'NewPassword3456',agreeTerms:true,captchaToken:buyerCaptcha.body.token,captchaAnswer:solveCaptcha(buyerCaptcha.body)}});assert.equal(buyerSignup.status,201);const checkout=await call(url,'/api/marketplace/checkout',{method:'POST',cookie:buyerSignup.cookie,body:{id:listingId}});assert.equal(checkout.status,202);assert.equal(checkout.body.order.downloadReleased,false);assert.equal(checkout.body.paymentProviderConnected,false);
 const credit=await call(url,'/api/marketplace/api-credits/quote',{method:'POST',cookie:creatorCookie,body:{amountUsd:5}});assert.equal(credit.status,422);
 const credit10=await call(url,'/api/marketplace/api-credits/quote',{method:'POST',cookie:creatorCookie,body:{amountUsd:10}});assert.equal(credit10.status,202);assert.equal(credit10.body.paymentEnabled,false);
 const guestArina=await call(url,'/api/arina/history');assert.equal(guestArina.status,200);const chatGuest=await call(url,'/api/arina/chat',{method:'POST',body:{nickname:'Guest',text:'hello'}});assert.equal(chatGuest.status,401);
 const chatSigned=await call(url,'/api/arina/chat',{method:'POST',cookie:creatorCookie,body:{nickname:'Creator',text:'hello'}});assert.equal(chatSigned.status,503,'no fake live AI responses');
 const setEmail=await call(url,'/api/account/email/set',{method:'POST',cookie:creatorCookie,body:{email:'creator-new@example.com',password:signup.password}});assert.equal(setEmail.status,200);assert.equal(setEmail.body.user.emailVerified,false);
 const revoked=await call(url,'/api/account/me',{cookie:creatorCookie});assert.equal(revoked.body.authenticated,false);
 const newLogin=await call(url,'/api/account/login',{method:'POST',body:{identifier:'creator-new@example.com',password:signup.password}});assert.equal(newLogin.status,200);
});
