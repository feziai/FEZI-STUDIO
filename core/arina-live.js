// FEZI AGENT: Arina live demo commands. These states control user-provided still
// storyboard sequences, not synthesized photorealistic video.
export const MOTIONS = Object.freeze(['idle','reading','typing','thinking','happy','thanks','heart','wink','return','kiss','dance']);
const matches = (s, patterns) => patterns.some(p=>p.test(s));
export function classifyArina(text='') {
  const s=String(text).trim().toLowerCase();
  if(!s) return 'idle';
  if(matches(s,[/برقص|رقص|dance|dancing|حرکات موزون/]))return 'dance';
  if(matches(s,[/قلب|heart|دست.?قلب|love you/]))return 'heart';
  if(matches(s,[/چشمک|wink|peace|✌/]))return 'wink';
  if(matches(s,[/بوس|kiss|بوسه/]))return 'kiss';
  if(matches(s,[/تشکر|ممنون|مرسی|سپاس|دونیت|donat|thank/]))return 'thanks';
  if(matches(s,[/بخند|خنده|خوشحال|شاد|haha|lol|خخخ|funny|smile|😂|🤣/]))return 'happy';
  if(matches(s,[/ناراحت|غم|بد|ناراضی|عصبانی|sad|bad|angry|😢|😡/]))return 'thinking';
  if(matches(s,[/تایپ|بنویس|نوشته|typing|write|type a|type /]))return 'typing';
  if(matches(s,[/بخوان|بخون|بخونی|خواندن|چت رو|read|message/]))return 'reading';
  if(matches(s,[/سوال|سؤال|چطور|چگونه|چرا|کمک|سخت|question|help|how|why|چیست/]))return 'thinking';
  return 'reading';
}
export function demoResponse(text, motion) {
  const s=String(text).toLowerCase();
  if(/سلام|hi|hello|درود/.test(s))return 'سلام! خوش اومدی به چت آرینا. دوست داری یه حرکت رو امتحان کنی؟ 🌷';
  if(motion==='dance')return 'چه خوب! یک رقص کوتاه و شاد برات اجرا می‌کنم، بعد برمی‌گردم سر چت. 💃';
  if(motion==='heart')return 'این قلب برای تو! 💗 ممنون که توی چت هستی.';
  if(motion==='wink')return 'چشمک مخصوص تو! 😉';
  if(motion==='kiss')return 'یه بوس هوایی دوستانه! 💕';
  if(motion==='thanks')return 'خیلی ممنونم! حمایتت کلی بهم انرژی می‌ده. 🌸';
  if(motion==='happy')return 'وای چه انرژی خوبی! 😄 خوشحالم کردی.';
  if(motion==='typing')return 'دارم جوابمو می‌نویسم... الان توی چت می‌بینیش. ⌨️';
  if(motion==='reading')return 'پیامت رو دیدم و خوندم. ممنون که بهم سر زدی! 💬';
  if(motion==='thinking')return 'سؤال جالبیه. این بخش فعلاً پیش‌نمایش حرکته؛ برای پاسخ دقیق به سؤال، موتور هوش مصنوعی باید به سرور وصل بشه.';
  if(/سلام|hi|hello|درود/.test(s))return 'سلام! خوش اومدی به چت آرینا. دوست داری یه حالت حرکتی رو امتحان کنی؟ 🌷';
  return 'پیامت رو دیدم! اینجا نسخه نمایشیِ چت و حرکات آریناست. 💬';
}
export function validateArinaMessage(data) {
  if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(new Error('Invalid payload'),{status:400});
  const text=String(data.message??'').trim();
  const nickname=String(data.nickname??'Guest').trim().slice(0,32);
  if(text.length<1||text.length>600)throw Object.assign(new Error('Message must be 1–600 characters'),{status:400});
  if(!/^[\p{L}\p{N} ._\-\u200c]{1,32}$/u.test(nickname))throw Object.assign(new Error('Invalid nickname'),{status:400});
  return {text,nickname};
}
