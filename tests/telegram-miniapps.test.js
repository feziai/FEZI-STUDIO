import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {miniAppUrls,miniAppMenu,miniAppKeyboard,normalizeSiteOrigin,verifyTelegramInitData} from '../core/telegram-miniapps.js';

const origin='https://fezi.example';
const token='123456789:AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPp';
function signedData(fields,secret=token){
 const q=new URLSearchParams(fields);
 const data=[...q.entries()].sort((a,b)=>a[0].localeCompare(b[0],'en')).map(([a,b])=>a+'='+b).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(secret).digest();
 q.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
 return q.toString();
}
test('Mini App URLs target existing FEZI Studio and Arina Live routes',()=>{
 const urls=miniAppUrls({PUBLIC_BASE_URL:origin});
 assert.deepEqual(urls,{studio:origin+'/studio',arina:origin+'/arina-live',wallet:origin+'/arina-wallet',gallery:origin+'/arina-gallery'});
 assert.equal(miniAppMenu('fezi',urls).web_app.url,origin+'/studio');
 assert.equal(miniAppMenu('arina',urls).web_app.url,origin+'/arina-live');
});
test('Mini App rejects insecure, credentials, paths, and deceptive origins',()=>{
 for(const u of ['http://example.com','https://u:p@example.com','https://example.com/fake','https://example.com?q=x','https://example.com#x'])
 assert.throws(()=>normalizeSiteOrigin(u));
});
test('Mini App buttons include one-tap launch and optional Arina Bot deep link',()=>{
 const urls=miniAppUrls({PUBLIC_BASE_URL:origin});
 const fezi=miniAppKeyboard('fezi',urls,{arinaBotUsername:'ArinaBot_123'});
 assert.equal(fezi.inline_keyboard[0][0].web_app.url,origin+'/studio');
 assert.equal(fezi.inline_keyboard[1][0].url,'https://t.me/ArinaBot_123?start');
 assert.equal(miniAppKeyboard('fezi',urls,{arinaBotUsername:'bad@address'}).inline_keyboard.length,1);
 const arina=miniAppKeyboard('arina',urls);
 assert.equal(arina.inline_keyboard[0][0].web_app.url,origin+'/arina-live');
 assert.equal(arina.inline_keyboard[1][0].url,origin+'/arina-wallet');
});
test('Signed Telegram initData verifies identity with fresh auth_date',()=>{
 const now=Date.UTC(2026,10,4,0,0,0),date=Math.floor(now/1000)-30;
 const data=signedData({auth_date:String(date),query_id:'abc',user:JSON.stringify({id:420123,first_name:'Arina',username:'testuser'})});
 const verified=verifyTelegramInitData(data,token,{now});
 assert.equal(verified.telegramId,420123);assert.equal(verified.username,'testuser');assert.equal(verified.verified,true);
});
test('Telegram initData rejects forged, expired, future, duplicate or malformed fields',()=>{
 const now=Date.UTC(2026,10,4,0,0,0),date=Math.floor(now/1000);
 const data=signedData({auth_date:String(date),user:JSON.stringify({id:420123,first_name:'Good'})});
 assert.throws(()=>verifyTelegramInitData(data.replace('Good','Evil'),token,{now}));
 assert.throws(()=>verifyTelegramInitData(data,token,{now:now+3600000}));
 assert.throws(()=>verifyTelegramInitData(data,token,{now:now-3600000}));
 assert.throws(()=>verifyTelegramInitData(data+'&auth_date='+date,token,{now}));
 assert.throws(()=>verifyTelegramInitData(data,'bad',{now}));
});
