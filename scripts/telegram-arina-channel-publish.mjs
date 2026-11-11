#!/usr/bin/env node
/** Publish ONE approved Arina viewing link to ONE explicitly configured channel. */
import {TelegramApi} from '../core/telegram-runtime.js';
import {normalizeTelegramChannel,arinaChannelAnnouncement} from '../core/arina-telegram-channel.js';
import {normalizeSiteOrigin} from '../core/telegram-miniapps.js';
const args=new Set(process.argv.slice(2));
const enabled=args.has('--publish')||args.has('--edit');
const channel=normalizeTelegramChannel(process.env.ARINA_CHANNEL_ID);
const origin=normalizeSiteOrigin(process.env.PUBLIC_BASE_URL||'');
const content=arinaChannelAnnouncement(origin);
const config={channel,origin,text:content.text,buttons:content.reply_markup.inline_keyboard,mode:enabled?'write':'dry-run'};
if(!enabled){console.log(JSON.stringify(config,null,2));process.exit(0)}
if(process.env.ARINA_CHANNEL_PUBLISH_ALLOWED!=='true')throw Error('Explicitly set ARINA_CHANNEL_PUBLISH_ALLOWED=true for this single authorized channel');
const token=process.env.TELEGRAM_ARINA_BOT_TOKEN||'';
if(!/^\d{5,12}:[A-Za-z0-9_-]{20,}$/.test(token))throw Error('TELEGRAM_ARINA_BOT_TOKEN is missing from private environment');
const api=new TelegramApi(token);
const me=await api.call('getMe');
const member=await api.call('getChatMember',{chat_id:channel,user_id:me.id});
if(member.status!=='creator' && !(member.status==='administrator'&&member.can_post_messages))throw Error('Arina bot must be a channel administrator with permission to post messages');
let result;
if(args.has('--edit')){
  const id=Number(process.env.ARINA_CHANNEL_MESSAGE_ID||'');
  if(!Number.isSafeInteger(id)||id<1)throw Error('Set ARINA_CHANNEL_MESSAGE_ID to an existing bot-authored channel announcement');
  result=await api.call('editMessageText',{chat_id:channel,message_id:id,text:content.text,reply_markup:content.reply_markup,disable_web_page_preview:true});
  console.log('Updated Arina channel announcement',JSON.stringify({channel,message_id:id,updated:true}));
}else{
  result=await api.call('sendMessage',{chat_id:channel,text:content.text,reply_markup:content.reply_markup,disable_web_page_preview:true});
  console.log('Published Arina channel announcement',JSON.stringify({channel,message_id:result.message_id}));
  if(args.has('--pin')){
    try{await api.call('pinChatMessage',{chat_id:channel,message_id:result.message_id,disable_notification:true});console.log('Pinned channel announcement')}catch(e){console.error('Pin requires additional permission:',String(e.message).replaceAll(token,'[REDACTED]'))}
  }
}
