#!/usr/bin/env node
/* Configuration check. Does NOT print or use secret values. */
const env=process.env;
const checks=[
 ['HTTPS site',/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(env.PUBLIC_BASE_URL||'')],
 ['FEZI bot token',/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_FEZI_BOT_TOKEN||'')],
 ['FEZI bot username',/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(env.TELEGRAM_FEZI_BOT_USERNAME||'')],
 ['Arina bot token',/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_ARINA_BOT_TOKEN||'')],
 ['Arina bot username',/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(env.TELEGRAM_ARINA_BOT_USERNAME||'')],
 ['Login bot token',/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_LOGIN_BOT_TOKEN||'')],
 ['Login bot username',/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(env.TELEGRAM_LOGIN_BOT_USERNAME||'')],
 ['Private bot bridge secret (>=32 chars)',(env.TELEGRAM_INTERNAL_TOKEN||'').length>=32],
 ['FEZI account session secret', (env.SESSION_SECRET||'').length>=24],
 ['Owner admin password', (env.APP_PASSWORD||'').length>=12]];
for(const [name,ok] of checks)console.log((ok?'OK  ':'NEEDS SETUP  ')+name);
console.log('Values withheld. Do not put tokens in Git, README, issue comments or chat.');
if(checks.some(([,ok])=>!ok))process.exitCode=2;
