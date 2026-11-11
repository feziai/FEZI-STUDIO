const $=id=>document.getElementById(id);
let assets=[],apps=[],walletProvider=null,selected=null,reviewed=false;
const status=(id,message)=>{$(id).textContent=message};
async function load(){
 try{
 const r=await fetch('/api/fezi/wallet-checkout/options',{credentials:'same-origin'});if(!r.ok)throw Error('فهرست کیف پول در دسترس نیست');
 const d=await r.json();assets=d.assets||[];apps=d.apps||[];reviewed=d.addressReviewed===true;
 const select=$('network');select.replaceChildren();
 for(const asset of assets){const opt=document.createElement('option');opt.value=asset.id;opt.textContent=asset.label+' · '+asset.network+(asset.addressFormatValid?'':' (بررسی لازم)');select.append(opt)}
 select.value=assets.find(a=>a.id==='usdt-bep20')?.id||assets[0]?.id||'';
 select.addEventListener('change',renderAsset);renderAsset();renderWallets();refreshOrders();
 }catch(e){status('network-warning',e.message)}
}
function renderAsset(){
 selected=assets.find(a=>a.id===$('network').value);if(!selected)return;
 $('asset-title').textContent=selected.label;
 $('asset-network').textContent=selected.network;
 $('coinmark').textContent=selected.symbol;
 $('coinmark').parentElement.style.background=selected.color;
 $('deposit').value=selected.addressFormatValid?selected.address:'آدرس نیازمند بررسی شبکه';
 $('qr').hidden=!selected.qr;$('qr-empty').hidden=!!selected.qr;
 if(selected.qr)$('qr').src=selected.qr;
 status('network-warning',!selected.addressFormatValid?'⚠️ آدرس این شبکه از بررسی اولیه عبور نکرده؛ QR غیرفعال است.':!reviewed?'⚠️ آدرس در کد ثبت شده اما مالکیت و شبکه توسط مدیر تأیید نشده‌اند. وجه ارسال نکنید.':'⚠️ آدرس بررسی شده، اما درگاه تأیید پرداخت هنوز متصل نیست؛ وجه ارسال نکنید.');
}
document.querySelectorAll('[data-amount]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-amount]').forEach(x=>x.classList.toggle('active',x===b));$('amount').value=b.dataset.amount;
}));
$('amount').addEventListener('input',()=>document.querySelectorAll('[data-amount]').forEach(x=>x.classList.toggle('active',x.dataset.amount===$('amount').value)));
$('copy-address').onclick=async()=>{if(!selected?.addressFormatValid)return;try{await navigator.clipboard.writeText(selected.address);status('network-warning','آدرس کپی شد. ⚠️ شبکه، مالکیت کیف پول و فعال بودن پرداخت را قبل از هر انتقال بررسی کنید.')}catch{status('network-warning','کپی خودکار ممکن نیست. آدرس را دستی انتخاب کن.')}};
$('create-order').onclick=async()=>{
 const amount=Number($('amount').value);
 if(!Number.isSafeInteger(amount)||amount<10||amount>100000){status('order-result','مبلغ باید عدد صحیح بین ۱۰ تا ۱۰۰٬۰۰۰ دلار باشد.');return}
 try{const r=await fetch('/api/api-keys/topup',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({amountUsd:amount})});const d=await r.json();if(!r.ok)throw Error(d.error||'ثبت سفارش ناموفق بود');
 status('order-result',`سفارش ${d.order.id} برای $${amount} ثبت شد. وضعیت: در انتظار سرویس پرداخت تأییدشده. اعتبار اضافه نشده است و هنوز نباید پول واریز شود.`);refreshOrders();
 }catch(e){status('order-result',e.message+' · ورود از قسمت حساب در بالای صفحه')}
};
function renderWallets(){const list=$('wallet-apps');list.replaceChildren();
 for(const app of apps){const b=document.createElement('button');b.type='button';b.className='wallet-tile';const ic=document.createElement('span');ic.className='wallet-symbol';ic.textContent=({'trust':'◆','coinbase':'C','metamask':'🦊','rainbow':'🌈','phantom':'👻','okx':'OK','exodus':'X','tokenpocket':'TP'})[app.id]||'◈';b.append(ic);const name=document.createElement('span');name.textContent=app.name;b.append(name);const helper=document.createElement('small');helper.textContent='اتصال / راهنما';b.append(helper);b.onclick=()=>connectWalletApp(app);list.append(b)}
}
function launchApp(app){
 if(location.protocol!=='https:'&&location.hostname!=='localhost')return status('connection-status','برای اتصال کیف پول از HTTPS معتبر استفاده کنید.');
 const webUrl=location.origin+'/purchase';let url=app.site;
 if(app.id==='trust')url='https://link.trustwallet.com/open_url?coin_id=60&url='+encodeURIComponent(webUrl);
 // Other wallets are opened at official websites; never imply they are connected.
 window.open(url,'_blank','noopener,noreferrer');
 status('connection-status',`صفحه ${app.name} باز شد؛ برای اتصال واقعی، سایت را در مرورگر داخلی کیف پول باز کرده و «اتصال کیف پول نصب‌شده» را بزنید. باز شدن اپ به معنی اتصال یا پرداخت نیست.`);
}
const providers=new Map();
window.addEventListener('eip6963:announceProvider',e=>{if(e.detail?.info?.rdns&&e.detail?.provider)providers.set(e.detail.info.rdns.toLowerCase(),e.detail.provider)});
window.dispatchEvent(new Event('eip6963:requestProvider'));
async function connect(provider){
 if(!provider?.request)throw Error('کیف پول EVM سازگار در این مرورگر پیدا نشد.');
 const accounts=await provider.request({method:'eth_requestAccounts'});
 const a=Array.isArray(accounts)?accounts[0]:'';
 if(!/^0x[0-9a-f]{40}$/i.test(a))throw Error('آدرس کیف پول دریافت نشد.');
 const chain=await provider.request({method:'eth_chainId'});
 walletProvider=provider;
 status('connection-status',`✓ کیف پول متصل شد: ${a.slice(0,7)}…${a.slice(-5)} · شبکه ${chain}. این اتصال پرداخت یا احراز هویت حساب FEZI نیست.`);
}
async function connectWalletApp(app){
 const rdnsHints={trust:['trustwallet'],coinbase:['coinbase'],metamask:['metamask'],rainbow:['rainbow'],phantom:['phantom'],okx:['okx'],exodus:['exodus'],tokenpocket:['tokenpocket']}[app.id]||[];
 const entry=[...providers].find(([rdns])=>rdnsHints.some(h=>rdns.includes(h)));
 let injected=entry?.[1];
 if(!injected&&window.ethereum?.providers){injected=window.ethereum.providers.find(p=>app.id==='metamask'?p.isMetaMask:app.id==='coinbase'?p.isCoinbaseWallet:app.id==='trust'?p.isTrust: false)}
 if(!injected&&window.ethereum&&(app.id==='metamask'?window.ethereum.isMetaMask:app.id==='coinbase'?window.ethereum.isCoinbaseWallet:app.id==='trust'?window.ethereum.isTrust:false))injected=window.ethereum;
 if(injected){try{await connect(injected)}catch(e){status('connection-status',e?.message||'اتصال رد شد')}return}
 launchApp(app);
}
$('connect-injected').onclick=async()=>{
 try{await connect(window.ethereum||providers.values().next().value)}catch(e){status('connection-status',e?.message||'اتصال ناموفق بود. برای موبایل روی کیف پول موردنظر بزنید.')}
};
load();

async function refreshOrders(){
 const el=$('orders');
 try{const r=await fetch('/api/api-keys/account',{credentials:'same-origin'});if(!r.ok)throw Error(r.status===401?'وارد حساب شو تا سفارش‌های خودت را ببینی.':'امکان دریافت سفارش‌ها نیست');
 const d=await r.json();el.replaceChildren();
 if(!d.orders?.length){el.textContent='هنوز سفارشی ثبت نشده است.';return}
 for(const o of [...d.orders].reverse().slice(0,10)){
  const item=document.createElement('div');item.className='saved-order';item.textContent=`$${o.amountUsd} · ${o.id} · ${o.status==='awaiting_verified_provider'?'در انتظار تأیید پرداخت':o.status} · ${o.settled?'تسویه‌شده':'بدون اعتبار'}`;el.append(item);
 }
 }catch(e){el.textContent=e.message}
}
