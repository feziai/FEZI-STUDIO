/** Public announcement for the existing Arina Mini App; not a native Telegram live-stream. */
import {normalizeSiteOrigin} from './telegram-miniapps.js';

export function normalizeTelegramChannel(value) {
  const id=String(value||'').trim();
  if (/^-100\d{5,16}$/.test(id)) return id;
  if (/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(id)) return id;
  throw Error('Specify an authorized Telegram channel with ARINA_CHANNEL_ID as -100... or @public_channel');
}

export function arinaChannelAnnouncement(origin) {
  const base=normalizeSiteOrigin(origin);
  const live=base+'/arina-live';
  return {
    text:'💗 آرینا | اتاق لایو FEZI Studio\n\n🎥 تماشای لایو تصویری آرینا و چت در مینی‌اپ\n📻 رادیوی آرینا در خود مینی‌اپ (پخش صدا با انتخاب کاربر)\n\nاین تصویر، پخش حلقه‌ای ویدیوهای ضبط‌شده است؛ استریم دوربین واقعی یا تماس تصویری زنده نیست.',
    reply_markup:{inline_keyboard:[
      [{text:'🎥 تماشای لایو آرینا',url:live}],
      [{text:'📻 رادیو و چت آرینا',url:live+'#chatForm'}],
      [{text:'📸 گالری آرینا',url:base+'/arina-gallery'}]
    ]}
  };
}

export const ARINA_BOT_COMMANDS=Object.freeze([
  {command:'start',description:'شروع و منوی آرینا'},
  {command:'live',description:'باز کردن لایو آرینا'},
  {command:'chat',description:'گفتگو با آرینا'},
  {command:'radio',description:'ایستگاه‌های رادیوی آرینا'},
  {command:'clips',description:'ویدیوهای آرینا'},
  {command:'album',description:'گالری تصاویر'},
  {command:'tip',description:'هدیه و حمایت'},
  {command:'private',description:'اتاق خصوصی و وضعیت دسترسی'},
  {command:'account',description:'اتصال حساب FEZI'},
  {command:'fezi',description:'سایت FEZI Studio'},
  {command:'status',description:'وضعیت پخش'},
  {command:'help',description:'راهنمای دستورات'}
]);
