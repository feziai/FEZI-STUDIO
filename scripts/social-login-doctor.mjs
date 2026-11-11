/** Server-side OAuth diagnostics (never prints secrets). Node 22+ */
const origin=String(process.env.PUBLIC_BASE_URL||'').trim().replace(/\/$/,'');
const valid=/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin);
const defs=[
 ['Google','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','/auth/google/callback'],
 ['GitHub','GITHUB_OAUTH_CLIENT_ID','GITHUB_OAUTH_CLIENT_SECRET','/auth/github/callback'],
 ['Facebook','FACEBOOK_APP_ID','FACEBOOK_APP_SECRET','/auth/facebook/callback'],
 ['Telegram OIDC','TELEGRAM_OIDC_CLIENT_ID','TELEGRAM_OIDC_CLIENT_SECRET','/auth/telegram/callback']
];
console.log('FEZI Studio — OAuth configuration doctor (does not contact providers)');
console.log('Public HTTPS domain:',valid?origin:'MISSING / INVALID');
for(const [name,idKey,secretKey,cb] of defs){
 const hasId=!!(process.env[idKey]||(name==='Google'&&process.env.GOOGLE_OAUTH_CLIENT_ID));
 const hasSecret=!!(process.env[secretKey]||(name==='Google'&&process.env.GOOGLE_OAUTH_CLIENT_SECRET));
 console.log(`${name}: ${hasId&&hasSecret?'CONFIGURED, UNVERIFIED':`MISSING ${!hasId?'CLIENT ID ':''}${!hasSecret?'CLIENT SECRET':''}`.trim()}`);
 console.log('  Redirect URL:',valid?origin+cb:'Set PUBLIC_BASE_URL first');
}
console.log('ChatGPT login: restricted partner onboarding; disabled until OpenAI authorization.');
console.log('Session security:',process.env.COOKIE_SECURE==='true'?'COOKIE_SECURE=true':'Set COOKIE_SECURE=true on production HTTPS host');
console.log('Production requires SESSION_SECRET, HTTPS, server persistence, provider configuration and live human sign-in tests.');
