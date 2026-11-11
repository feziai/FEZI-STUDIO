#!/usr/bin/env node
/** Safely configure display name, description, commands, and a single Mini App menu per registered bot.
 * Dry-run by default. Never print tokens; bot username changes require @BotFather.
 */
import fs from 'node:fs/promises';
import {TelegramApi} from '../core/telegram-runtime.js';
import {normalizeSiteOrigin} from '../core/telegram-miniapps.js';
const profiles=JSON.parse(await fs.readFile(new URL('../config/telegram-bot-profiles.json',import.meta.url),'utf8'));
const args=new Set(process.argv.slice(2));const apply=args.has('--apply'),target=[...args].find(v=>v.startsWith('--bot='))?.slice(6);
const selected=profiles.filter(p=>!target||p.id===target);
if(!selected.length)throw Error('Unknown --bot= ID');
const origin=normalizeSiteOrigin(process.env.PUBLIC_BASE_URL||'');
const commands=[{command:'start',description:'شروع و مشاهده منو'},{command:'help',description:'راهنمای سرویس و مینی اپ'}];
for(const p of selected){
 const configured=!!process.env[p.env];
 console.log(JSON.stringify({bot:p.id,displayName:p.name,bio:p.bio,miniApp:origin+p.path,tokenConfigured:configured,mode:apply?'apply':'dry-run'}));
 if(!apply||!configured)continue;
 const token=process.env[p.env];if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Invalid server token for '+p.id);
 const api=new TelegramApi(token);
 const me=await api.call('getMe');
 await api.call('setMyName',{name:p.name.slice(0,64)});
 await api.call('setMyShortDescription',{short_description:p.bio.slice(0,120)});
 await api.call('setMyDescription',{description:(p.bio+'\nFEZI Studio — '+origin+p.path).slice(0,512)});
 await api.call('setMyCommands',{commands});
 await api.call('setChatMenuButton',{menu_button:{type:'web_app',text:'FEZI Mini App',web_app:{url:origin+p.path}}});
 console.log('Telegram profile configured for @'+me.username+'; BotFather username/Main Mini App are separate.');
}
