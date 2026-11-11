/* Supplemental, server-backed Hugging Face cloud-video UI. Existing video studio is unchanged. */
const $=id=>document.getElementById(id);
async function api(url,opts={}){const r=await fetch(url,{credentials:'same-origin',...opts});let d={};try{d=await r.json()}catch{d.error='Invalid server response'}if(!r.ok)throw Error(d.error||'HTTP '+r.status);return d}
let job=null;
function message(x){$('cloud-notice').textContent=x}
async function poll(){if(!job)return;try{
 const result=await api('/api/fezi-cloud-video/jobs/'+job);
 message('وضعیت: '+result.status+(result.error?' · '+result.error:''));
 if(result.status==='completed'){
  $('cloud-result').replaceChildren();const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=result.videoUrl;video.style.cssText='width:100%;border-radius:14px;max-height:440px';
  const dl=document.createElement('a');dl.href=result.videoUrl;dl.download='fezi-video.mp4';dl.textContent='↓ دانلود MP4';dl.className='cloud-download';
  $('cloud-result').append(video,dl);job=null;$('cloud-generate').disabled=false;
 }else if(['failed','interrupted'].includes(result.status)){job=null;$('cloud-generate').disabled=false}
 else setTimeout(poll,4000);
}catch(e){job=null;message('خطا: '+e.message);$('cloud-generate').disabled=false}}
async function boot(){try{const state=await api('/api/fezi-cloud-video/status');
 const available=state.models.filter(m=>m.approved);
 $('cloud-model').replaceChildren(...available.map(m=>new Option(m.name+' · '+m.provider,m.id)));
 $('cloud-generate').disabled=!state.ready;
 message(state.ready?'● اتصال ابری توسط مدیر فعال شده؛ سهمیه روزانه '+state.maxUserDaily+' ویدیو برای هر حساب. هزینه احتمالی با FEZI است.':'○ سرویس ابری هنوز فعال نیست. مدل‌ها قابل بررسی‌اند اما پردازش انجام نمی‌شود.');
 $('cloud-info').textContent='سرویس: Hugging Face Inference Providers | ویدیوها فقط برای حساب شما قابل دریافت‌اند | مدت انتخاب‌شده تقریبی است و به ارائه‌دهنده وابسته است | سقف روزانه تعداد درخواست، سقف هزینه دلاری نیست.';
}catch(e){message('وضعیت سرویس در دسترس نیست: '+e.message)}}
$('cloud-form').onsubmit=async e=>{e.preventDefault();$('cloud-generate').disabled=true;$('cloud-result').replaceChildren();message('در حال ثبت درخواست...');
 try{const payload={model:$('cloud-model').value,duration:Number($('cloud-duration').value),prompt:$('cloud-prompt').value.trim()};
  if(payload.prompt.length<8)throw Error('متن ویدیو کوتاه است.');
  const r=await api('/api/fezi-cloud-video/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  job=r.id;message('درخواست در صف پردازش ثبت شد.');setTimeout(poll,2000);
 }catch(e){message('ثبت انجام نشد: '+e.message);$('cloud-generate').disabled=false}}
boot();
