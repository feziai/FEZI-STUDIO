/** FEZI Studio external OAuth/OIDC helpers. Never sends secrets to browsers. */
import crypto from 'node:crypto';

const b64 = v => Buffer.from(v).toString('base64url');
const hmac = (secret,v) => crypto.createHmac('sha256', secret).update(v).digest('base64url');
const secureEqual = (a,b) => typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const providerCredentials = (env=process.env) => ({
 github:{id:env.GITHUB_OAUTH_CLIENT_ID||'',secret:env.GITHUB_OAUTH_CLIENT_SECRET||''},
 facebook:{id:env.FACEBOOK_APP_ID||'',secret:env.FACEBOOK_APP_SECRET||''},
 telegram:{id:env.TELEGRAM_OIDC_CLIENT_ID||'',secret:env.TELEGRAM_OIDC_CLIENT_SECRET||''}
});
export function flowCookie(provider,secret,{userId='',pkce=true}={}){
 const s=crypto.randomBytes(24).toString('base64url');
 const verifier=pkce?crypto.randomBytes(36).toString('base64url'):'';
 const nonce=crypto.randomBytes(24).toString('base64url');
 const payload=b64(JSON.stringify({s,verifier,nonce,uid:userId,until:Date.now()+600000,provider}));
 return {state:s,verifier,nonce,value:payload+'.'+hmac(secret,payload)};
}
export function checkFlowCookie(value,secret,provider,state){
 const bits=String(value||'').split('.');
 if(bits.length!==2||!secureEqual(bits[1],hmac(secret,bits[0])))throw Error('Invalid OAuth session');
 let x;try{x=JSON.parse(Buffer.from(bits[0],'base64url').toString('utf8'))}catch{throw Error('Invalid OAuth session')}
 if(x.provider!==provider||x.until<Date.now()||!secureEqual(x.s,state))throw Error('Invalid or expired OAuth state');
 return x;
}
export function challenge(verifier){return crypto.createHash('sha256').update(verifier).digest('base64url')}
export async function fetchJSON(url,opts={}){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{const r=await fetch(url,{...opts,signal:controller.signal,headers:{accept:'application/json',...opts.headers}});
  if(!r.ok)throw Error('OAuth provider temporarily unavailable ('+r.status+')');
  const data=await r.json();if(data.error)throw Error('OAuth authorization failed');return data;
 }finally{clearTimeout(timeout)}
}
export async function githubIdentity(code,redirect,config,verifier){
 const data=await fetchJSON('https://github.com/login/oauth/access_token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_id:config.id,client_secret:config.secret,code,redirect_uri:redirect,code_verifier:verifier})});
 if(!data.access_token)throw Error('GitHub token exchange failed');
 const opts={headers:{authorization:'Bearer '+data.access_token,'user-agent':'FEZI-Studio','x-github-api-version':'2022-11-28'}};
 const user=await fetchJSON('https://api.github.com/user',opts);
 if(!user?.id)throw Error('GitHub identity unavailable');
 let email='';
 const emails=await fetchJSON('https://api.github.com/user/emails',opts).catch(()=>[]);
 if(Array.isArray(emails)){const primary=emails.find(e=>e.verified&&e.primary)||emails.find(e=>e.verified);email=String(primary?.email||'').toLowerCase()}
 return {sub:String(user.id),name:String(user.name||user.login||'GitHub user'),email,emailVerified:!!email};
}
export async function facebookIdentity(code,redirect,config,version='v24.0'){
 const base='https://graph.facebook.com/'+(/^v\d+\.\d+$/.test(version)?version:'v24.0');
 const form=new URLSearchParams({client_id:config.id,client_secret:config.secret,redirect_uri:redirect,code});
 const data=await fetchJSON(base+'/oauth/access_token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form.toString()});
 if(!data.access_token)throw Error('Facebook token exchange failed');
 const user=await fetchJSON(base+'/me?fields=id,name,email',{headers:{authorization:'Bearer '+data.access_token}});
 if(!user?.id)throw Error('Facebook identity unavailable');
 // Facebook does not provide email_verified in this response.
 return {sub:String(user.id),name:String(user.name||'Facebook user'),email:String(user.email||'').toLowerCase(),emailVerified:false};
}
const TG_ISSUER='https://oauth.telegram.org';
const TG_DISCOVERY='https://oauth.telegram.org/.well-known/openid-configuration';
export async function telegramDiscovery(){
 const d=await fetchJSON(TG_DISCOVERY);
 for(const key of ['authorization_endpoint','token_endpoint','jwks_uri'])if(!String(d[key]||'').startsWith(TG_ISSUER+'/'))throw Error('Invalid Telegram OIDC discovery');
 if(d.issuer!==TG_ISSUER)throw Error('Invalid Telegram OIDC issuer');
 return d;
}
export function validateTelegramJwt(jwt,keys,{audience,nonce,issuer=TG_ISSUER,now=Math.floor(Date.now()/1000)}={}){
 const parts=String(jwt||'').split('.');if(parts.length!==3)throw Error('Invalid Telegram id_token');
 let header,claims;try{header=JSON.parse(Buffer.from(parts[0],'base64url'));claims=JSON.parse(Buffer.from(parts[1],'base64url'))}catch{throw Error('Invalid Telegram id_token')}
 if(header.alg!=='RS256'||!header.kid||!Array.isArray(keys))throw Error('Unsupported Telegram signing algorithm');
 const jwk=keys.find(x=>x.kid===header.kid&&x.kty==='RSA'&&(!x.use||x.use==='sig')&&(!x.alg||x.alg==='RS256'));
 if(!jwk)throw Error('Telegram signing key not found');
 const ok=crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url'));
 if(!ok||claims.iss!==issuer||!(Array.isArray(claims.aud)?claims.aud.includes(String(audience)):String(claims.aud)===String(audience))||claims.nonce!==nonce||typeof claims.exp!=='number'||claims.exp<=now||claims.iat>now+60||claims.nbf>now+60||!claims.sub)throw Error('Invalid Telegram identity signature or claims');
 return claims;
}
export async function telegramIdentity(code,redirect,config,flow,discovery){
 const body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirect,client_id:config.id,client_secret:config.secret,code_verifier:flow.verifier});
 const tokens=await fetchJSON(discovery.token_endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString()});
 if(!tokens.id_token)throw Error('Telegram OIDC token missing');
 const jwks=await fetchJSON(discovery.jwks_uri);
 const info=validateTelegramJwt(tokens.id_token,jwks.keys,{audience:config.id,nonce:flow.nonce,issuer:discovery.issuer});
 return {sub:String(info.sub),name:String(info.name||info.given_name||info.preferred_username||'Telegram user'),email:'',emailVerified:false};
}

export function validateGoogleJwt(jwt,keys,{audience,nonce,now=Math.floor(Date.now()/1000)}={}){
 const parts=String(jwt||'').split('.');if(parts.length!==3)throw Error('Invalid Google identity token');
 let header,claims;try{header=JSON.parse(Buffer.from(parts[0],'base64url'));claims=JSON.parse(Buffer.from(parts[1],'base64url'))}catch{throw Error('Invalid Google token format')}
 if(header.alg!=='RS256'||!header.kid||!Array.isArray(keys))throw Error('Invalid Google token algorithm');
 const jwk=keys.find(x=>x.kid===header.kid&&x.kty==='RSA'&&(!x.alg||x.alg==='RS256'));
 if(!jwk||!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('Unverified Google JWT signature');
 if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||!(Array.isArray(claims.aud)?claims.aud.includes(audience):claims.aud===audience)||claims.nonce!==nonce||typeof claims.exp!=='number'||claims.exp<=now||typeof claims.iat!=='number'||claims.iat>now+60||claims.nbf>now+60||!claims.sub||claims.email_verified!==true)throw Error('Invalid Google identity claims');
 return claims;
}
export async function googleIdentity(code,redirect,config,flow){
 const body=new URLSearchParams({code,client_id:config.id,client_secret:config.secret,redirect_uri:redirect,grant_type:'authorization_code',code_verifier:flow.verifier});
 const tokens=await fetchJSON('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString()});
 if(!tokens.id_token)throw Error('Missing Google identity token');
 const jwks=await fetchJSON('https://www.googleapis.com/oauth2/v3/certs');
 const info=validateGoogleJwt(tokens.id_token,jwks.keys,{audience:config.id,nonce:flow.nonce});
 return {sub:String(info.sub),name:String(info.name||info.given_name||'Google user'),email:String(info.email||'').toLowerCase(),emailVerified:true};
}
