const $=(id)=>document.getElementById(id);
let bots=[];
const statusText={online:'متصل',awaiting_token:'در انتظار توکن',error:'خطای اتصال',duplicate_token:'توکن تکراری'};
function render(){
 const term=$('filter').value.trim().toLocaleLowerCase('fa');
 $('agents').replaceChildren();
 for(const a of bots.filter(b=>(b.name+' '+b.role).toLocaleLowerCase('fa').includes(term))){
   const card=document.createElement('button');card.className='bot';card.type='button';
   const head=document.createElement('div');head.className='bot-head';
   const img=document.createElement('img');img.src=a.avatar;img.alt=a.name;
   const wrapper=document.createElement('div');
   const title=document.createElement('b');title.textContent=a.name;
   const status=document.createElement('span');status.className='status '+(a.status==='online'?'online':'');
   status.textContent=statusText[a.status]||'در انتظار اتصال';
   wrapper.append(title,status);head.append(img,wrapper);
   const desc=document.createElement('p');desc.className='role';desc.textContent=a.role;
   card.append(head,desc);
   card.onclick=()=>{$('selectAgent').value=a.id;$('prompt').focus();
      $('messages').textContent=`${a.name}\n${a.role}\nوضعیت تلگرام: ${status.textContent}`;};
   $('agents').append(card);
 }
}
async function refresh(){
 try{
  const [ar,sr,ss]=await Promise.all([fetch('/api/agents'),fetch('/api/skills'),fetch('/api/status')]);
  if(!ar.ok||!sr.ok||!ss.ok)throw new Error('خطا در خواندن وضعیت');
  bots=(await ar.json()).agents;const skills=(await sr.json()).skills;const info=await ss.json();
  $('totalCount').textContent=bots.length;$('onlineCount').textContent=info.online;
  $('skillCount').textContent=skills.length;
  const selected=$('selectAgent').value;$('selectAgent').replaceChildren();
  for(const a of bots){const opt=document.createElement('option');opt.value=a.id;opt.textContent=a.name;$('selectAgent').append(opt);}
  if(bots.some(a=>a.id===selected))$('selectAgent').value=selected;
  render();
 }catch(e){$('messages').textContent=e.message;}
}
$('filter').addEventListener('input',render);
$('chatForm').addEventListener('submit',async(ev)=>{
 ev.preventDefault();
 const message=$('prompt').value.trim();if(!message)return;
 $('messages').textContent='در حال پاسخ‌گویی...';
 try{
  const res=await fetch('/api/chat',{method:'POST',headers:{
   'content-type':'application/json','authorization':'Bearer '+$('auth').value
  },body:JSON.stringify({message,agentId:$('selectAgent').value})});
  const data=await res.json();
  $('messages').textContent=data.answer||data.error||'پاسخی دریافت نشد.';
  if(res.ok)$('prompt').value='';
 }catch{$('messages').textContent='ارتباط با سرور برقرار نشد.';}
});
refresh();setInterval(refresh,60000);
