const detail=JSON.parse(document.getElementById('detail-data').textContent);
const copyButton=document.getElementById('copy'),useButton=document.getElementById('use');
async function copyText(text){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return true}catch{}}
 const e=document.createElement('textarea');e.value=text;e.style.position='fixed';e.style.left='-9999px';document.body.append(e);e.select();let ok=false;try{ok=document.execCommand('copy')}catch{}e.remove();return ok;
}
copyButton?.addEventListener('click',async()=>{let ok=await copyText(detail.prompt);copyButton.textContent=ok?'✓ Copied to clipboard':'Select prompt text above and copy';if(!ok){const s=window.getSelection(),r=document.createRange();r.selectNodeContents(document.getElementById('copy-text'));s.removeAllRanges();s.addRange(r)}});
useButton?.addEventListener('click',()=>{try{sessionStorage.setItem('fezi_prompt_to_studio',detail.prompt)}catch{}location.href='/studio?category='+encodeURIComponent(detail.kind==='writing'?'writing':detail.kind==='code'?'coding':detail.kind)});
// Related cards support the same one-tap actions as the library without reloading.
document.querySelectorAll('.related .card-copy,.related .card-use').forEach(btn=>btn.addEventListener('click',()=>{const slug=btn.dataset.slug;location.href='/prompts/'+encodeURIComponent(slug)}));

const shareButton=document.getElementById('share');
shareButton?.addEventListener('click',async()=>{
 try{if(navigator.share){await navigator.share({title:document.title,url:location.href});return}}catch(e){if(e?.name==='AbortError')return}
 const ok=await copyText(location.href);shareButton.textContent=ok?'✓ Link copied':'Share via browser';
});
