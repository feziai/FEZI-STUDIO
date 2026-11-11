#!/usr/bin/env node
/** cPanel cron fallback: run once daily >=09:00 UTC; only opt-in users, idempotent. */
import path from 'node:path';
import {TelegramApi} from '../core/telegram-runtime.js';
import {createPublicBot} from '../core/telegram-public.js';
if(new Date().getUTCHours()<9)throw Error('Schedule cron no earlier than 09:00 UTC');
const token=process.env.TELEGRAM_FEZI_BOT_TOKEN||process.env.TELEGRAM_BOT_TOKEN||'';if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('Bot token missing');
const bot=createPublicBot({api:new TelegramApi(token),storeFile:path.resolve(process.env.DATA_DIR||'./data','telegram-public/users.json'),webAppUrl:process.env.TELEGRAM_WEBAPP_URL||'',botSecret:process.env.TELEGRAM_INTERNAL_TOKEN||''});await bot.init();console.log(await bot.sendDaily());
