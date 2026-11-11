const $=id=>document.getElementById(id);
const state={providers:[],projects:[],project:null,files:{},savedFiles:{},file:'index.html',dirty:false,pending:null,lang:localStorage.getItem('fezi-lang')||'en',toastTimer:null,activeTaskId:null};
const strings={
fa:{welcome:'استودیوی برنامه‌نویسی هوشمند شما',loginHint:'رمز مدیریتی تعیین‌شده در تنظیمات سرور را وارد کنید.',login:'ورود به استودیو',projects:'پروژه‌های من',newProject:'＋ ساخت پروژه جدید',toolbox:'جعبه‌ابزار متن‌باز',viewTools:'مشاهده همه ابزارها',logout:'خروج',workspace:'محیط کار',newFile:'+ فایل',save:'ذخیره',export:'دریافت ZIP',aiEngine:'موتور هوش مصنوعی',provider:'ارائه‌دهنده',model:'مدل',check:'بررسی اتصال',unchecked:'بررسی‌نشده',files:'فایل‌های پروژه',editorNote:'ویرایشگر سبک داخلی',preview:'پیش‌نمایش زنده',previewNote:'پیش‌نمایش محدود به HTML، CSS و JavaScript است؛ اجرای Node.js به محیط ایزوله نیاز دارد.',assistant:'دستیار برنامه‌نویسی',ready:'آماده',askHint:'سایت یا تغییری را که می‌خواهی به فارسی یا انگلیسی بنویس. هوش مصنوعی کدهای موردنیاز را پیشنهاد می‌دهد و قبل از اعمال تغییرات می‌توانی آن‌ها را بررسی کنی.',generate:'✦ تولید کد',created:'پروژه ساخته شد',saved:'فایل‌ها ذخیره شدند',applied:'تغییرات هوش مصنوعی اعمال شدند',createProject:'ساخت پروژه جدید',projectName:'نام پروژه',template:'قالب شروع',landing:'صفحه معرفی',dashboard:'داشبورد',live_avatar:'آواتار زنده و سخنگو',blank:'پروژه خالی',canvas_game:'بازی تحت وب (قابل اجرا)',godot_game:'بازی Godot 4 (سورس)',blender_3d:'مدل سه‌بعدی Blender (سورس)',create:'ساخت پروژه',newFileTitle:'افزودن فایل',filename:'مسیر فایل (مثلاً assets/info.txt)',add:'افزودن فایل',toolsTitle:'ابزارهای متن‌باز برای اتصال در مراحل بعدی',toolsDesc:'این ابزارها در نسخه فعلی نصب نشده‌اند؛ پیوندهای رسمی و نقش هر ابزار برای توسعه نسخه کامل ارائه شده است.',notConnected:'FEZI AGENT در دسترس نیست',connected:'مدل‌های محلی پیدا شدند',review:'پیشنهاد هوش مصنوعی آماده است',apply:'✓ اعمال تغییرات',noProject:'اول یک پروژه بساز',busy:'در حال تولید کد…',noChanges:'مدل فایل معتبری نداد',discard:'تغییرات ذخیره‌نشده از بین می‌روند. ادامه می‌دهید؟',askFile:'مسیر فایل را وارد کنید',unauthorized:'دسترسی معتبر نیست؛ دوباره وارد شوید'},
en:{welcome:'Your AI-powered development workspace',loginHint:'Enter the admin password set on your server.',login:'Sign in',projects:'My projects',newProject:'＋ New project',toolbox:'Open-source toolbox',viewTools:'Browse integrations',logout:'Sign out',workspace:'Workspace',newFile:'+ File',save:'Save',export:'Export ZIP',aiEngine:'AI engine',provider:'Provider',model:'Model',check:'Check connection',unchecked:'Not checked',files:'Project files',editorNote:'Built-in editor',preview:'Live preview',previewNote:'Preview supports static HTML/CSS/JavaScript. Node.js execution requires an isolated runner.',assistant:'Coding assistant',ready:'Ready',askHint:'Describe your website or requested changes. The AI proposes complete updated files, and you review them before applying.',generate:'✦ Generate code',created:'Project created',saved:'Files saved',applied:'AI changes applied',createProject:'New project',projectName:'Project name',template:'Starter template',landing:'Landing page',dashboard:'Dashboard',live_avatar:'Live talking avatar',blank:'Blank project',canvas_game:'Playable Canvas Game',godot_game:'Godot 4 Game Source',blender_3d:'Blender 3D Source',create:'Create project',newFileTitle:'Add file',filename:'File path (e.g. assets/info.txt)',add:'Add file',toolsTitle:'Open-source tools for future integration',toolsDesc:'These tools are not installed in this MVP. Their official repos and integration roles are provided for future development.',notConnected:'FEZI AGENT is unavailable',connected:'Local models found',review:'AI proposal is ready',apply:'✓ Apply changes',noProject:'Create a project first',busy:'Generating code…',noChanges:'The model returned no valid files',discard:'Discard unsaved changes?',askFile:'Enter a file path',unauthorized:'Session expired. Please sign in again'}};
const tr=k=>strings[state.lang][k]||k;
strings.fa.node='سرور Node.js';strings.en.node='Node.js API';strings.fa.react='React + Vite';strings.en.react='React + Vite';strings.fa.python='پایتون';strings.en.python='Python';
const tools=[]; // Dependencies and licensing remain in server-side technical documentation.

function translate(){document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='fa'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=tr(e.dataset.i18n));$('prompt').placeholder=state.lang==='fa'?'چه چیزی بسازیم یا تغییر بدهیم؟':'What should we build or change?';$('language').textContent=state.lang==='fa'?'EN':'فا';renderProjects();}
async function api(url,method='GET',body){const response=await fetch(url,{method,headers:{'content-type':'application/json'},credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body)});let payload;try{payload=await response.json();}catch{payload={error:'Invalid server response'};}if(!response.ok){if(response.status===401&&url!='/api/login'){showLogin();throw Error(tr('unauthorized'));}throw Error(payload.error||'HTTP '+response.status);}return payload;}
function toast(message,bad=false){const t=$('toast');t.textContent=message;t.style.borderColor=bad?'#ef8787':'#526780';t.classList.remove('hidden');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>t.classList.add('hidden'),4000);}
function showLogin(){$('workspace').classList.add('hidden');$('login').classList.remove('hidden');}
function showApp(){$('login').classList.add('hidden');$('workspace').classList.remove('hidden');}
function node(tag,attrs={},children=[]){const e=document.createElement(tag);for(const [key,value]of Object.entries(attrs)){if(key==='text')e.textContent=value;else if(key==='class')e.className=value;else if(key==='href'){e.href=value;}else e.setAttribute(key,value);}for(const c of children)e.append(c);return e;}
function renderProjects(){const parent=$('projects');parent.replaceChildren();for(const p of state.projects){const b=node('button',{class:'project'+(p.id===state.project?.id?' active':''),title:p.name},[node('span',{class:'project-icon',text:'◫'}),node('span',{class:'name',text:p.name})]);b.addEventListener('click',()=>openProject(p.id));parent.append(b);}if(!state.projects.length)parent.append(node('p',{class:'subtle',text:state.lang==='fa'?'هنوز پروژه‌ای وجود ندارد.':'No projects yet.'}));}
function renderTools(){$('toolsShort').replaceChildren();}
function renderFiles(){const list=$('fileTabs');list.replaceChildren();for(const f of Object.keys(state.files).sort()){const b=node('button',{class:'file-tab'+(state.file===f?' selected':''),text:f});b.addEventListener('click',()=>{state.file=f;renderFiles();renderEditor();});list.append(b);}renderEditor();}
function renderEditor(){$('activeFilename').textContent=state.file;$('code').value=state.files[state.file]??'';renderLines();}
function renderLines(){const n=$('code').value.split('\n').length;$('lines').textContent=Array.from({length:n},(_,i)=>String(i+1)).join('\n');}
function buildPreview(){const files=state.files;let html=files['index.html']||'<!doctype html><html><body><h1>No index.html</h1></body></html>';const css=files['style.css']||'';const js=files['script.js']||'';
html=html.replace(/<link\b[^>]*href\s*=\s*["']style\.css["'][^>]*>/gi,'').replace(/<script\b[^>]*src\s*=\s*["']script\.js["'][^>]*>\s*<\/script\s*>/gi,'');
const csp='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src https: data: blob:; font-src data:; connect-src \'none\'; form-action \'none\'">';
const styles='<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>';
const scripts='<script>'+js.replace(/<\/script/gi,'<\\/script')+'<\/script>';
if(/<head[^>]*>/i.test(html))html=html.replace(/<head[^>]*>/i,match=>match+csp+styles);else html=csp+styles+html;
if(/<\/body>/i.test(html))html=html.replace(/<\/body>/i,scripts+'</body>');else html+=scripts;
$('previewFrame').srcdoc=html;
}
async function loadProjects(){const r=await api('/api/projects');state.projects=r.projects;renderProjects();if(!state.project&&r.projects.length)await openProject(r.projects[0].id);else if(!r.projects.length)openCreateModal();}
async function openProject(id){if(state.dirty&&!confirm(tr('discard')))return;const data=await api('/api/project?id='+encodeURIComponent(id));state.project=data.project;state.files=data.files;state.file=Object.hasOwn(state.files,'index.html')?'index.html':Object.keys(state.files)[0];state.pending=null;state.dirty=false;state.savedFiles={...state.files};$('projectTitle').textContent=data.project.name;renderProjects();renderFiles();buildPreview();$('messages').replaceChildren(node('div',{class:'assistant-msg',text:tr('askHint')}));$('sidebar').classList.remove('open');}
function modal(contents){$('modalContent').replaceChildren(contents);$('modal').classList.remove('hidden');}
function closeModal(){$('modal').classList.add('hidden');}
function openCreateModal(){const box=node('div');box.append(node('h2',{text:tr('createProject')}));const f=node('form');const nameLabel=node('label',{text:tr('projectName')});const name=node('input',{type:'text',maxlength:'65',required:'required',value:'My AI App'});const tplLabel=node('label',{text:tr('template')});const tpl=node('select');for(const key of ['landing','dashboard','live_avatar','blank','node','react','python','canvas_game','godot_game','blender_3d'])tpl.append(node('option',{value:key,text:tr(key)}));const btn=node('button',{class:'primary',type:'submit',text:tr('create')});f.append(nameLabel,name,tplLabel,tpl,btn);f.addEventListener('submit',async e=>{e.preventDefault();btn.disabled=true;try{const r=await api('/api/projects','POST',{name:name.value,template:tpl.value});closeModal();state.project=null;state.dirty=false;await loadProjects();await openProject(r.project.id);toast(tr('created'));}catch(error){toast(error.message,true);}finally{btn.disabled=false;}});box.append(f);modal(box);}
function openFileModal(){if(!state.project)return toast(tr('noProject'),true);const box=node('div');box.append(node('h2',{text:tr('newFileTitle')}));const f=node('form');const lbl=node('label',{text:tr('filename')});const inp=node('input',{type:'text',required:'required',placeholder:'components/card.js'});const btn=node('button',{class:'primary',type:'submit',text:tr('add')});f.append(lbl,inp,btn);f.addEventListener('submit',async e=>{e.preventDefault();const filename=inp.value.trim();if(Object.hasOwn(state.files,filename))return toast('File already exists',true);try{await api('/api/save','POST',{id:state.project.id,files:[{path:filename,content:''}]});state.files[filename]='';state.savedFiles[filename]='';state.file=filename;closeModal();renderFiles();toast(tr('saved'));}catch(error){toast(error.message,true);}});box.append(f);modal(box);}
function openToolsModal(){const box=node('div');box.append(node('h2',{text:tr('toolsTitle')}),node('p',{text:tr('toolsDesc')}));for(const t of tools){const row=node('div',{class:'modal-tool'});const info=node('div');info.append(node('h3',{text:t.name}),node('p',{text:t.role}));const a=node('a',{text:'GitHub ↗',href:t.repo,target:'_blank',rel:'noopener noreferrer'});row.append(info,a);box.append(row);}modal(box);}
async function save(){
 if(!state.project)return toast(tr('noProject'),true);
 const diff=Object.entries(state.files).filter(([name,content])=>state.savedFiles[name]!==content);
 if(!diff.length){state.dirty=false;return true;}
 try{
   const groups=[];let current=[],size=0;
   for(const [filePath,content] of diff){
     const item={path:filePath,content};const bytes=new TextEncoder().encode(JSON.stringify(item)).length+2;
     if(current.length&&(current.length>=24||size+bytes>750_000)){groups.push(current);current=[];size=0;}
     current.push(item);size+=bytes;
   }
   if(current.length)groups.push(current);
   for(const group of groups){
     await api('/api/save','POST',{id:state.project.id,files:group});
     for(const item of group)state.savedFiles[item.path]=item.content;
   }
   state.dirty=Object.entries(state.files).some(([name,content])=>state.savedFiles[name]!==content);
   if(!state.dirty)toast(tr('saved'));
   return !state.dirty;
 }catch(e){state.dirty=true;toast(e.message,true);return false;}
}
function renderActionSteps(parent,events){
 let view=parent.querySelector('.fezi-event-list');if(!view){view=document.createElement('section');view.className='fezi-event-list';parent.append(view)}
 const current=Array.isArray(events)?events:[];view.replaceChildren();
 for(const [i,e] of current.entries()){
  const item=document.createElement('details');item.className='fezi-step';
  const head=document.createElement('summary');head.textContent=`${i+1}. ${String(e.type||'step').replaceAll('_',' ')} · ${String(e.summary||'Action').slice(0,90)}`;
  const details=document.createElement('p');details.textContent=`Activity: ${e.summary||'No details'}\nTime: ${e.at||e.timestamp||'not supplied'}\nNote: these are recorded execution milestones, not hidden model reasoning.`;
  item.append(head,details);view.append(item);
 }
}
function addMessage(className,message){const b=node('div',{class:className,text:message});$('messages').append(b);$('messages').scrollTop=$('messages').scrollHeight;return b;}
async function applyProposal(changes){for(const item of changes)state.files[item.path]=item.content;state.file=changes[0]?.path||state.file;state.dirty=true;renderFiles();buildPreview();return await save();}
async function generate(e){e.preventDefault();if(!state.project)return toast(tr('noProject'),true);if($('autonomous').checked)return generateAgent();const prompt=$('prompt').value.trim();if(prompt.length<3)return toast('Enter a prompt',true);if(state.dirty){await save();if(state.dirty)return;}
addMessage('user-msg',prompt);$('prompt').value='';const loader=addMessage('assistant-msg',tr('busy'));loader.prepend(node('img',{src:'/landing/assets/fezi-agent.png',alt:'FEZI Agent',class:'fezi-typing-logo'}));$('generate').disabled=true;
try{const r=await api('/api/fezi/ai','POST',{id:state.project.id,prompt});loader.remove();const summary=node('div',{class:'result-msg'});summary.append(node('strong',{text:tr('review')}),node('div',{text:r.summary+(r.plan?'\n\nPlan: '+r.plan:'')+(r.review?'\n\nReview: '+r.review:'')+'\n\n'+r.files.map(f=>'• '+f.path).join('\n')}));const b=node('button',{class:'apply-btn',text:tr('apply')});b.onclick=async()=>{b.disabled=true;try{if(!await applyProposal(r.files))b.disabled=false;}catch(error){toast(error.message,true);b.disabled=false;}};summary.append(b);$('messages').append(summary);$('messages').scrollTop=$('messages').scrollHeight;
}catch(error){loader.textContent='⚠ '+error.message;toast(error.message,true);}finally{$('generate').disabled=false;}}
async function checkModels(){
 const badge=$('connection');badge.className='connection';badge.textContent='…';
 try{const result=await api('/api/fezi/status');badge.className='connection '+(result.ready?'ok':'fail');badge.textContent=result.ready?'● FEZI AGENT آماده است':'● FEZI AGENT به اتصال نیاز دارد';}
 catch{badge.className='connection fail';badge.textContent='● FEZI AGENT در دسترس نیست';}
}



function publishModal(){
  if(!state.project)return toast(tr('noProject'),true);
  if(state.dirty)return toast(state.lang==='fa'?'اول تغییرات را ذخیره کن.':'Save first',true);
  const fa=state.lang==='fa'; const box=node('div');
  box.append(node('h2',{text:fa?'انتشار پروژه · FEZI AGENT':'Publish project · FEZI AGENT'}));
  box.append(node('p',{text:fa?'انتشار روی زیردامنه به تنظیمات DNS و سرور نیاز دارد. انتشار در GitHub یک Pull Request برای بازبینی ایجاد می‌کند.':'Subdomain publishing needs DNS/server setup. GitHub creates a reviewable pull request.'}));
  const form=node('form');
  const modeLabel=node('label',{text:fa?'روش انتشار':'Publish target'}),mode=node('select');
  [['local','Subdomain / local hosting'],['github','GitHub pull request'],['webhook','Remote host webhook']].forEach(([value,text])=>mode.append(node('option',{value,text})));
  const slugLabel=node('label',{text:fa?'زیردامنه، مثال: bg':'Subdomain slug (e.g. bg)'}),slug=node('input',{type:'text',pattern:'[a-z0-9-]+',value:'my-site',required:'required'});
  const repoLabel=node('label',{text:'GitHub owner/repository'}),repo=node('input',{type:'text',placeholder:'owner/repository'});
  repoLabel.style.display='none';repo.style.display='none';
  mode.onchange=()=>{repo.style.display=repoLabel.style.display=mode.value==='github'?'block':'none';};
  const btn=node('button',{class:'primary',type:'submit',text:fa?'بازبینی و انتشار':'Confirm and publish'});
  form.append(modeLabel,mode,slugLabel,slug,repoLabel,repo,btn);
  form.onsubmit=async ev=>{
    ev.preventDefault();
    const warning=fa?'آیا انتشار این فایل‌ها را تأیید می‌کنی؟ سایت قبلی روی این زیردامنه ممکن است جایگزین شود.':'Confirm deployment? Existing files at this subdomain may be replaced.';
    if(!confirm(warning))return;
    btn.disabled=true;
    try{
      const kind=mode.value;
      const endpoint=kind==='github'?'/api/github/publish':kind==='webhook'?'/api/host/deploy':'/api/publish';
      const body={id:state.project.id,slug:slug.value.toLowerCase(),subdomain:slug.value.toLowerCase(),repo:repo.value.trim(),confirm:true};
      const response=await api(endpoint,'POST',body);
      const notice=response.pullRequest||response.branchUrl||response.published?.url||(response.ok?'Remote host accepted deployment':JSON.stringify(response));
      const textArea=node('div',{class:'publish-result',text:notice||'Published locally (BASE_DOMAIN not set)'});
      if((response.pullRequest||response.branchUrl)){const link=node('a',{href:notice,target:'_blank',rel:'noopener noreferrer',text:'Open GitHub pull request / branch'});textArea.append(node('div'),link);}
      box.append(textArea);toast(fa?'فرایند انتشار انجام شد':'Published');
    }catch(ex){toast(ex.message,true);box.append(node('p',{class:'message error',text:ex.message}));}
    finally{btn.disabled=false;}
  };
  box.append(form);modal(box);
}

async function generateAgent(){
 if(!state.project)return toast(tr('noProject'),true);
 const goal=$('prompt').value.trim();if(goal.length<4)return toast('Describe the job',true);
 if(state.activeTaskId)return toast(state.lang==='fa'?'یک کار دیگر در حال اجراست':'A task is already running',true);
 if(state.dirty){await save();if(state.dirty)return;}
 addMessage('user-msg',goal);$('prompt').value='';$('generate').disabled=true;
 try{
   const response=await api('/api/fezi/tasks','POST',{id:state.project.id,goal,maxSteps:6});
   state.activeTaskId=response.task.id;
   const id=response.task.id;const status=$('agentStatus');status.classList.remove('hidden');status.textContent='⟳ FEZI AGENT · started';
   const log=addMessage('assistant-msg',state.lang==='fa'?'عامل خودکار در حال بررسی پروژه است…':'Agent is working on the project…');const milestones=document.createElement('div');milestones.className='fezi-milestones';log.after(milestones);
   let last='';
   for(let i=0;i<160 && state.activeTaskId===id;i++){
      await new Promise(r=>setTimeout(r,1300));
      const r=await api('/api/fezi/task?taskId='+encodeURIComponent(id));const task=r.task;
      const recent=task.events.slice(-5).map(e=>e.type+': '+e.summary).join('\n');
      if(recent!==last){last=recent;log.textContent=task.status+' · '+(task.result?.summary||'Actions recorded below');renderActionSteps(milestones,task.events);}
      status.textContent='⟳ FEZI AGENT · '+task.status+' · step '+task.step+'/'+task.maxSteps;
      if(['completed','failed','cancelled','incomplete','interrupted'].includes(task.status)){
        if(task.status==='completed'||task.status==='incomplete'){
          const project=await api('/api/project?id='+encodeURIComponent(state.project.id));
          state.files=project.files;state.savedFiles={...state.files};state.file=Object.hasOwn(state.files,state.file)?state.file:Object.keys(state.files)[0];state.dirty=false;renderFiles();buildPreview();
        }
        log.textContent=(task.result?.summary||task.error||task.status)+'\n'+recent+'\nCheckpoint: '+(task.checkpointId||'none');
        break;
      }
   }
 }catch(err){addMessage('assistant-msg','⚠ '+err.message);toast(err.message,true);}
 finally{state.activeTaskId=null;$('generate').disabled=false;$('agentStatus').classList.add('hidden');}
}
function importSiteModal(){
 if(!state.project)return toast(tr('noProject'),true);
 const box=node('div');box.append(node('h2',{text:state.lang==='fa'?'ورود صفحه عمومی سایت':'Import public website'}),node('p',{text:state.lang==='fa'?'فقط دامنه‌های تأییدشده توسط مدیر سرور مجاز هستند. این ابزار HTML عمومی را ذخیره می‌کند، نه دیتابیس، بک‌اند یا محتوای رمزدار.':'Only server-allowlisted public HTTPS domains. Static HTML capture, not a backend/database clone.'}));
 const form=node('form'),url=node('input',{type:'url',placeholder:'https://example.org/',required:'required'}),button=node('button',{type:'submit',class:'primary',text:'Import static HTML'});
 form.append(url,button);form.onsubmit=async ev=>{ev.preventDefault();if(!confirm('Import the public page into this project? Existing index.html will be changed. A snapshot will be created.'))return;button.disabled=true;
  try{const r=await api('/api/website/import','POST',{id:state.project.id,url:url.value,confirm:true});closeModal();const p=await api('/api/project?id='+state.project.id);state.files=p.files;state.savedFiles={...state.files};state.file='index.html';state.dirty=false;renderFiles();buildPreview();addMessage('result-msg','Imported: '+r.title+'\n'+r.limitations.join('\n')+'\nCheckpoint: '+r.checkpointId);}
  catch(e){toast(e.message,true);}finally{button.disabled=false;}};
 box.append(form);modal(box);
}
async function snapshotsModal(){
 if(!state.project)return toast(tr('noProject'),true);
 const r=await api('/api/snapshots?id='+state.project.id),box=node('div');box.append(node('h2',{text:state.lang==='fa'?'نسخه‌های بازگشت پروژه':'Project checkpoints'}));
 const make=node('button',{class:'primary',text:state.lang==='fa'?'ساخت نسخه پشتیبان':'Create checkpoint'});make.onclick=async()=>{await api('/api/snapshots','POST',{id:state.project.id,label:'manual checkpoint'});closeModal();snapshotsModal();};box.append(make);
 for(const item of r.snapshots){const row=node('div',{class:'modal-tool'});const desc=node('div');desc.append(node('b',{text:item.label}),node('p',{text:item.createdAt+' · '+item.fileCount+' files'}));const btn=node('button',{class:'ghost',text:'Restore'});btn.onclick=async()=>{if(!confirm('Restore this checkpoint? A new backup will be created first.'))return;try{await api('/api/snapshots/restore','POST',{id:state.project.id,snapshotId:item.id,confirm:true});closeModal();const p=await api('/api/project?id='+state.project.id);state.files=p.files;state.savedFiles={...state.files};state.dirty=false;renderFiles();buildPreview();toast('Checkpoint restored');}catch(e){toast(e.message,true);}};row.append(desc,btn);box.append(row);}
 modal(box);
}
function huggingFaceModal(){const box=node('div');box.append(node('h2',{text:'FEZI AGENT · Library'}),node('p',{text:'Discover AI models. Installation and execution are managed by FEZI AGENT.'}));const f=node('form'),q=node('input',{placeholder:'qwen coder',required:'required'}),b=node('button',{type:'submit',class:'primary',text:'Search'}),list=node('div');f.append(q,b);f.onsubmit=async e=>{e.preventDefault();b.disabled=true;list.replaceChildren();try{const r=await api('/api/huggingface/search?q='+encodeURIComponent(q.value));for(const m of r.models){const row=node('div',{class:'modal-tool'});row.append(node('span',{text:m.id+(m.gated?' · gated':'')}),node('a',{href:m.link,text:'View model',target:'_blank',rel:'noopener noreferrer'}));list.append(row);}}catch(e){list.textContent=e.message;}finally{b.disabled=false;}};box.append(f,list);modal(box);}

function specialistModal(){
 const fa=state.lang==='fa',box=node('div');
 box.append(node('h2',{text:fa?'ابزارهای تخصصی FEZI AGENT':'FEZI AGENT creative tools'}),
 node('p',{text:fa?'FEZI AGENT موتور مناسب را انتخاب می‌کند. ساخت فایل واقعی به سرویس اجرایی متصل نیاز دارد.':'FEZI AGENT chooses the right engine internally. Actual file generation requires a connected execution worker.'}));
 const form=node('form'),role=node('select'),prompt=node('textarea',{rows:'4',placeholder:fa?'خروجی موردنظر را توضیح بده...':'Describe what you want to create...',required:'required'}),submit=node('button',{type:'submit',class:'primary',text:fa?'شروع با FEZI AGENT':'Run FEZI AGENT'}),result=node('div',{class:'modal-tool'});
 for(const [v,title] of [['image',fa?'ساخت تصویر':'Image'],['video',fa?'ساخت ویدیو':'Video'],['text_to_speech',fa?'ساخت صدا':'Text to speech'],['speech_to_text',fa?'تبدیل گفتار به متن':'Speech to text'],['ocr',fa?'درک متن تصویر':'Document OCR'],['embedding',fa?'جست‌وجوی معنایی':'Semantic search'],['rerank',fa?'مرتب‌کردن نتایج':'Rerank results']])role.append(node('option',{value:v,text:title}));
 form.append(role,prompt,submit);
 form.onsubmit=async ev=>{ev.preventDefault();submit.disabled=true;result.textContent=fa?'در حال بررسی سرویس اجرایی...':'Connecting to execution worker...';
  try{const response=await api('/api/fezi/specialist','POST',{role:role.value,prompt:prompt.value,inputs:{}});
   result.replaceChildren(node('p',{text:response.summary}));
   if(response.artifact){const url=new URL(response.artifact,location.href);if(url.protocol==='https:'||url.origin===location.origin)result.append(node('a',{href:url.href,text:fa?'مشاهده فایل خروجی':'Open generated file',target:'_blank',rel:'noopener noreferrer'}));}
  }catch(e){result.textContent=(fa?'اتصال اجرایی فعال نیست: ':'Execution unavailable: ')+e.message;}finally{submit.disabled=false;}
 };
 box.append(form,result);modal(box);
}
async function init(){renderTools();translate();const me=await api('/api/me');state.providers=[{id:'auto',label:'FEZI AGENT',configured:true,model:''}];
$('provider').value='auto';$('model').value='';if(me.authenticated){showApp();await loadProjects();checkModels();}else showLogin();}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').classList.add('hidden');try{await api('/api/login','POST',{password:$('password').value});$('password').value='';showApp();await loadProjects();checkModels();}catch(error){$('loginError').textContent=error.message;$('loginError').classList.remove('hidden');}});
$('newProject').onclick=openCreateModal;$('newProjectSmall').onclick=openCreateModal;$('newFile').onclick=openFileModal;$('allTools').onclick=openToolsModal;$('modalClose').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal();};$('save').onclick=save;
$('specialistOpen').onclick=specialistModal;$('publish').onclick=publishModal;$('importSite').onclick=importSiteModal;$('snapshots').onclick=()=>snapshotsModal().catch(e=>toast(e.message,true));$('hfModels').onclick=huggingFaceModal;
$('export').onclick=()=>{if(!state.project)return toast(tr('noProject'),true);if(state.dirty)return toast(state.lang==='fa'?'ابتدا تغییرات را ذخیره کنید':'Save changes first',true);const a=document.createElement('a');a.href='/api/export?id='+encodeURIComponent(state.project.id);a.click();};
$('logout').onclick=async()=>{await api('/api/logout','POST');state.project=null;state.files={};state.savedFiles={};showLogin();};
$('language').onclick=()=>{state.lang=state.lang==='fa'?'en':'fa';localStorage.setItem('fezi-lang',state.lang);translate();};
$('mobileMenu').onclick=()=>$('sidebar').classList.toggle('open');
$('checkModels').onclick=checkModels;$('refreshPreview').onclick=buildPreview;$('desktop').onclick=()=>{$('previewWrap').classList.remove('mobile');$('desktop').classList.add('active');$('mobile').classList.remove('active');};$('mobile').onclick=()=>{$('previewWrap').classList.add('mobile');$('mobile').classList.add('active');$('desktop').classList.remove('active');};
$('code').addEventListener('input',()=>{if(!state.project)return;state.files[state.file]=$('code').value;state.dirty=true;renderLines();clearTimeout(window.previewDebounce);window.previewDebounce=setTimeout(buildPreview,420);});
$('code').addEventListener('scroll',()=>{$('lines').scrollTop=$('code').scrollTop;});
$('code').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const el=e.target,start=el.selectionStart;el.setRangeText('  ',start,el.selectionEnd,'end');el.dispatchEvent(new Event('input'));}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save();}});
$('promptForm').addEventListener('submit',generate);
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('promptForm').requestSubmit();}});
document.querySelectorAll('.suggestions button').forEach(b=>b.onclick=()=>{$('prompt').value=b.dataset.prompt;$('prompt').focus();});
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
init().catch(e=>toast(e.message,true));

// v0.5 source-build export dialog. Actual native compilation runs in CI / Android SDK / Xcode.
document.getElementById('buildExport').addEventListener('click',()=>{
 if(!state.project){toast(tr('noProject'),true);return;}
 const box=node('div');box.append(node('h2',{text:state.lang==='fa'?'دریافت خروجی پروژه':'Export project for mobile'}));
 box.append(node('p',{text:state.lang==='fa'?'PWA قابل نصب یا سورس آماده ساخت Android/iOS. برای APK باید پروژه در Android SDK یا GitHub Actions ساخته شود.':'Get installable PWA source or a Capacitor source project. APK must be compiled by Android SDK / GitHub Actions.'}));
 const form=node('form'),kind=node('select'),appId=node('input',{type:'text',value:'ai.fezi.generated',placeholder:'ai.fezi.myapp'}),go=node('button',{class:'primary',type:'submit',text:state.lang==='fa'?'دریافت بسته ZIP':'Download source ZIP'});
 for(const [id,label] of [['pwa','PWA (Web app)'],['mobile','Android + iOS source'],['android','Android source'],['ios','iOS source']])kind.append(node('option',{value:id,text:label}));
 form.append(node('label',{text:'Output format'}),kind,node('label',{text:'Application ID (mobile only)'}),appId,go);
 form.onsubmit=async e=>{e.preventDefault();go.disabled=true;
  try{
   if(state.dirty)await save();
   const response=await fetch('/api/build/export',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:state.project.id,kind:kind.value,appId:appId.value})});
   if(!response.ok){let r;try{r=await response.json();}catch{}throw Error(r?.error||'Export failed');}
   const blob=await response.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='fezi-'+kind.value+'-'+state.project.id.slice(0,6)+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(href),5000);closeModal();
  }catch(err){toast(err.message,true);}finally{go.disabled=false;}
 };
 box.append(form);modal(box);
});

// v0.9 guided-task Academy: navigation, model run, feedback. It does NOT train weights.
$('academyOpen').onclick=async()=>{
  try {
    const catalog=await api('/api/academy/catalog');
    const container=node('div',{class:'academy-root'});
    container.append(node('h2',{text:'آکادمی FEZI AGENT · '+catalog.total_tasks.toLocaleString('fa-IR')+' تسک'}));
    container.append(node('p',{class:'subtle',text:'تمرین و ارزیابی ساختاریافته؛ نه آموزش وزن‌های مدل. جواب‌ها فقط پس از اجرای یک مدل واقعی تولید می‌شوند.'}));
    const picker=node('select',{class:'academy-select'});
    for(const c of catalog.categories)picker.append(node('option',{value:c.id,text:c.title_fa+' · '+c.count.toLocaleString('fa-IR')}));
    const taskArea=node('div',{class:'academy-task'}),controls=node('div',{class:'academy-controls'});
    const pageBox=node('input',{type:'number',value:'1',min:'1',step:'1',style:'width:100px',title:'شماره صفحه'});
    const next=node('button',{class:'ghost',text:'تسک بعدی'}),load=node('button',{class:'ghost',text:'نمایش صفحه'});
    controls.append(picker,pageBox,load,next);
    container.append(controls,taskArea);
    let currentTask=null,taskOffset=0,currentPage=1;
    async function fetchCurrent(){
      const data=await api('/api/academy/tasks?category='+encodeURIComponent(picker.value)+'&page='+currentPage+'&limit=10');
      if(!data.items.length){taskArea.replaceChildren(node('p',{text:'صفحه‌ای با این شماره وجود ندارد'}));return;}
      currentTask=data.items[Math.min(taskOffset,data.items.length-1)];drawTask();
    }
    async function drawTask(){
      taskArea.replaceChildren();const task=currentTask;if(!task)return;
      taskArea.append(node('h3',{text:task.id+' · '+task.topic}));
      taskArea.append(node('p',{text:task.task}));
      const criteria=node('ul');for(const criterion of task.acceptance_criteria)criteria.append(node('li',{text:criterion}));
      taskArea.append(node('h4',{text:'معیارهای موفقیت'}),criteria);
      const status=node('div',{class:'academy-result'});
      const recommendation=node('button',{class:'ghost',text:'انتخاب خودکار FEZI AGENT'});
      const run=node('button',{class:'primary',text:'اجرای تسک با FEZI AGENT'});
      const completed=node('button',{class:'ghost',text:'ثبت بررسی‌شده'});
      const failed=node('button',{class:'ghost',text:'ثبت نیاز به اصلاح'});
      const row=node('div',{class:'academy-controls'});row.append(recommendation,run,completed,failed);taskArea.append(row,status);
      recommendation.onclick=async()=>{try{const r=await api('/api/fezi/academy/recommend?id='+encodeURIComponent(task.id));status.replaceChildren(node('pre',{text:JSON.stringify(r,null,2)}));}catch(e){toast(e.message,true);}};
      run.onclick=async()=>{run.disabled=true;status.textContent='FEZI AGENT در حال پاسخ‌گویی است (ممکن است هزینه سرویس متصل وجود داشته باشد)...';try{
        const r=await api('/api/fezi/academy/attempt','POST',{taskId:task.id});
        status.replaceChildren(node('pre',{text:r.text}),node('small',{text:'این پاسخ مستقل ارزیابی نشده و فایل تصویر/ویدیو یا APK ساخته نشده است.'}));
      }catch(e){status.textContent=e.message;}finally{run.disabled=false;}};
      async function mark(statusValue){try{await api('/api/academy/progress','POST',{taskId:task.id,status:statusValue,notes:'ثبت دستی توسط مدیر'});toast('وضعیت ذخیره شد');}catch(e){toast(e.message,true);}}
      completed.onclick=()=>mark('passed');failed.onclick=()=>mark('needs_review');
    }
    picker.onchange=()=>{taskOffset=0;currentPage=1;pageBox.value='1';fetchCurrent().catch(e=>toast(e.message,true));};
    load.onclick=()=>{const n=Number(pageBox.value);if(!Number.isInteger(n)||n<1)return toast('شماره صفحه نامعتبر است',true);currentPage=n;taskOffset=0;fetchCurrent().catch(e=>toast(e.message,true));};
    next.onclick=()=>{taskOffset++;if(taskOffset>=10){taskOffset=0;currentPage++;pageBox.value=String(currentPage);fetchCurrent().catch(e=>toast(e.message,true));}else fetchCurrent().catch(e=>toast(e.message,true));};
    modal(container);await fetchCurrent();
  }catch(e){toast(e.message,true);}
};


// Export a real editor-compatible workspace; desktop editor installation runs on the user's PC.
$('desktopExport').onclick=async()=>{
 if(!state.project)return toast(tr('noProject'),true);
 if(state.dirty)return toast(state.lang==='fa'?'ابتدا فایل‌ها را ذخیره کنید':'Save changes first',true);
 const box=node('div');
 box.append(node('h2',{text:state.lang==='fa'?'اتصال به ویرایشگر دسکتاپ':'Desktop editor workspace'}));
 box.append(node('p',{text:state.lang==='fa'?'یک بسته آماده با فایل‌های پروژه، AGENTS.md و تنظیمات ویرایشگر دانلود کن. ابزارهای دسکتاپ باید روی کامپیوترت نصب باشند.':'Download your project with AGENTS.md and editor settings; desktop programs must be installed separately.'}));
 const list=node('div');
 try {
  const response=await api('/api/desktop/tools');
  for(const tool of response.tools){const row=node('div',{class:'modal-tool'});
   row.append(node('span',{text:tool.name+' · '+tool.kind}),node('a',{href:tool.repo,text:'GitHub',target:'_blank',rel:'noopener noreferrer'}));list.append(row);
  }
 }catch(e){list.textContent=e.message;}
 const btn=node('button',{class:'primary',text:state.lang==='fa'?'دریافت بسته دسکتاپ':'Download workspace ZIP'});
 btn.onclick=()=>{const link=document.createElement('a');link.href='/api/desktop/export?id='+encodeURIComponent(state.project.id);link.click();};
 box.append(btn,list);modal(box);
};

try{const pendingPrompt=sessionStorage.getItem("fezi-pending-prompt");if(pendingPrompt){const input=document.getElementById("prompt");if(input)input.value=pendingPrompt;sessionStorage.removeItem("fezi-pending-prompt");}}catch{}
