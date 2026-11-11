import {AnnouncementStore} from './store.mjs';
let store;
/** Call from the bot's existing update consumer; never run a second getUpdates consumer. */
export async function announcementSubscription(update,token,send){
 const m=update.message;if(!m||m.chat?.type!=='private'||m.from?.is_bot||!/^\/(subscribe|unsubscribe)(?:@\w+)?\s*$/.test(m.text||''))return false;
 if(!process.env.ANNOUNCEMENT_MASTER_KEY){await send({chat_id:m.chat.id,text:'سرویس اطلاعیه هنوز تنظیم نشده است.'});return true}
 store ||=new AnnouncementStore(process.env.ANNOUNCEMENT_DB||'data/announcement.sqlite',process.env.ANNOUNCEMENT_MASTER_KEY);
 const bot=token.split(':')[0];
 try{if(m.text.startsWith('/unsubscribe'))store.unsubscribe(bot,String(m.chat.id));else store.subscribe(bot,String(m.chat.id),'private','Explicit /subscribe from Telegram user');await send({chat_id:m.chat.id,text:m.text.startsWith('/unsubscribe')?'عضویت اطلاعیه لغو شد.':'اطلاعیه‌های FEZI فعال شد. لغو: /unsubscribe'});}catch{await send({chat_id:m.chat.id,text:'ربات هنوز به مرکز اطلاعیه متصل نشده است.'})}return true;
}
