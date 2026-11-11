#!/usr/bin/env node
/** Dry-run unless --apply. Configures Bot API menu only; Main App must be set in BotFather. */
import {TelegramApi} from '../core/telegram-runtime.js';
import {miniAppUrls,miniAppMenu} from '../core/telegram-miniapps.js';
const args=new Set(process.argv.slice(2));
const kind=args.has('--bot=arina')?'arina':args.has('--bot=fezi')?'fezi':null;
if(!kind)throw Error('Choose --bot=fezi or --bot=arina');
const urls=miniAppUrls();
const button=miniAppMenu(kind,urls);
const token=kind==='arina'?process.env.TELEGRAM_ARINA_BOT_TOKEN:(process.env.TELEGRAM_FEZI_BOT_TOKEN||process.env.TELEGRAM_BOT_TOKEN);
console.log(JSON.stringify({bot:kind,menuButton:button,mode:args.has('--apply')?'apply':'dry-run',mainApp:'Configure Main Mini App in @BotFather separately'},null,2));
if(args.has('--apply')) {
  if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token||''))throw Error('Bot token is missing or malformed. Set the bot-specific token in server environment.');
  const api=new TelegramApi(token);const me=await api.call('getMe');
  await api.call('setChatMenuButton',{menu_button:button});
  console.log('Menu configured for @'+me.username+' (profile Main App still requires BotFather).');
}
