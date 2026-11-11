import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createStudioV15} from '../core/studio-v15.js';
import {flowCookie,checkFlowCookie,challenge,validateTelegramJwt,validateGoogleJwt,providerCredentials} from '../core/social-oauth-v102.js';
const root=process.cwd();
function res(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},getHeader(k){return this.headers[k.toLowerCase()]},writeHead(n,h={}){this.code=n;this.headers={...this.headers,...Object.fromEntries(Object.entries(h).map(([k,v])=>[k.toLowerCase(),v]))}},end(t){this.raw=t?String(t):''}};}
function request(url){return {method:'GET',url,headers:{host:'localhost:3000'},socket:{remoteAddress:'127.0.0.1',encrypted:false},async *[Symbol.asyncIterator](){}};}
function jwt(pair,head,claims){const a=Buffer.from(JSON.stringify(head)).toString('base64url'),b=Buffer.from(JSON.stringify(claims)).toString('base64url');const sig=crypto.sign('RSA-SHA256',Buffer.from(a+'.'+b),pair.privateKey).toString('base64url');return `${a}.${b}.${sig}`;}
test('flows are signed, bound to specific provider, expire, contain PKCE',()=>{
 const secret='S'.repeat(60),f=flowCookie('github',secret,{userId:'abc'});
 assert.equal(challenge(f.verifier).length,43);assert.equal(checkFlowCookie(f.value,secret,'github',f.state).uid,'abc');
 assert.throws(()=>checkFlowCookie(f.value,secret,'facebook',f.state),/state/);
 assert.throws(()=>checkFlowCookie(f.value,secret,'github','fake'),/state/);
 assert.throws(()=>checkFlowCookie(f.value+'bad',secret,'github',f.state),/session/);
});
test('real cryptographic Google JWT verification rejects wrong audience and tampering',()=>{
 const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk=pair.publicKey.export({format:'jwk'});jwk.kid='key1';
 const now=Math.floor(Date.now()/1000),base={iss:'https://accounts.google.com',aud:'sample-client',nonce:'xyz',sub:'100',email:'example@website.test',email_verified:true,iat:now-10,exp:now+300};
 const token=jwt(pair,{alg:'RS256',kid:'key1'},base);
 assert.equal(validateGoogleJwt(token,[jwk],{audience:'sample-client',nonce:'xyz'}).email,base.email);
 assert.throws(()=>validateGoogleJwt(token,[jwk],{audience:'different',nonce:'xyz'}));
 assert.throws(()=>validateGoogleJwt(token+'bad',[jwk],{audience:'sample-client',nonce:'xyz'}));
 assert.throws(()=>validateGoogleJwt(jwt(pair,{alg:'RS256',kid:'key1'},{...base,email_verified:false}),[jwk],{audience:'sample-client',nonce:'xyz'}));
});
test('Telegram JWT requires verified RS256, matching issuer, nonce and audience',()=>{
 const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk=pair.publicKey.export({format:'jwk'});jwk.kid='key2';
 const now=Math.floor(Date.now()/1000),base={iss:'https://oauth.telegram.org',aud:'12345',nonce:'test',sub:'1234567',iat:now-10,exp:now+300};
 const token=jwt(pair,{alg:'RS256',kid:'key2'},base);
 assert.equal(validateTelegramJwt(token,[jwk],{audience:'12345',nonce:'test'}).sub,base.sub);
 assert.throws(()=>validateTelegramJwt(token,[jwk],{audience:'12345',nonce:'wrong'}));
 assert.throws(()=>validateTelegramJwt(jwt(pair,{alg:'RS256',kid:'key2'},{...base,exp:now-1}),[jwk],{audience:'12345',nonce:'test'}));
});
test('Social identity status has no secrets and authorization redirects are secured',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-social-auth-'));
 const before={GITHUB_OAUTH_CLIENT_ID:process.env.GITHUB_OAUTH_CLIENT_ID,GITHUB_OAUTH_CLIENT_SECRET:process.env.GITHUB_OAUTH_CLIENT_SECRET,PUBLIC_BASE_URL:process.env.PUBLIC_BASE_URL};
 try{
 process.env.GITHUB_OAUTH_CLIENT_ID='demo_public_id';process.env.GITHUB_OAUTH_CLIENT_SECRET='SECRET_NOT_FOR_BROWSERS';delete process.env.PUBLIC_BASE_URL;
 const studio=createStudioV15({root,dataDir:dir,sessionSecret:'z'.repeat(70),authenticatedOwner:()=>false,runText:async()=>''});await studio.init();
 const status=res();await studio.handle(request('/api/auth/providers'),status,'/api/auth/providers');
 assert.equal(status.code,200);const parsed=JSON.parse(status.raw);assert.equal(parsed.providers.github.configured,true);assert.equal(parsed.providers.chatgpt.configured,false);assert.ok(!status.raw.includes('SECRET_NOT_FOR_BROWSERS'));
 const out=res();await studio.handle(request('/auth/github'),out,'/auth/github');assert.equal(out.code,302);assert.match(out.headers.location,/github\.com\/login\/oauth\/authorize/);assert.ok(!out.headers.location.includes('SECRET_NOT_FOR_BROWSERS'));assert.match(out.headers['set-cookie'],/HttpOnly/);
 assert.match(out.headers.location,/code_challenge=/);
 const bad=res();await assert.rejects(studio.handle(request('/auth/github/callback?code=no&state=wrong'),bad,'/auth/github/callback'),/OAuth CSRF/);
 const chatgpt=res();await studio.handle(request('/auth/chatgpt'),chatgpt,'/auth/chatgpt');assert.equal(chatgpt.code,501);
 }finally{for(const [k,v] of Object.entries(before))if(v===undefined)delete process.env[k];else process.env[k]=v;await fs.rm(dir,{recursive:true,force:true})}
});
test('all social login icons and buttons are bundled and ChatGPT sign-in is correctly disabled',async()=>{
 const html=await fs.readFile('public/studio/index.html','utf8');const js=await fs.readFile('public/auth-icons/providers.js','utf8');
 for(const name of ['google','github','facebook','telegram','chatgpt']){assert.match(html,new RegExp('auth-icons/'+name+'\\.svg'));assert.match(await fs.readFile('public/auth-icons/'+name+'.svg','utf8'),/<svg/)}
 assert.match(html,/data-auth-provider="chatgpt"[^>]*aria-disabled="true"/);assert.match(js,/api\/auth\/providers/);
 const server=await fs.readFile('server.js','utf8');assert.match(server,/auth-icons/);
});
