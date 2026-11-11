/** Safe, read-only FEZI Studio release preflight; never logs or sends secrets. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env=process.env;
const present=k=>String(env[k]||'').length>5;
const checks=[];
function check(name,passed,category='required',detail=''){checks.push({name,ok:Boolean(passed),category,detail})}
check('Node.js 22+',Number(process.versions.node.split('.')[0])>=22);
check('APP_PASSWORD at least 10 characters',String(env.APP_PASSWORD||'').length>=10);
check('SESSION_SECRET at least 24 characters and separate from password',String(env.SESSION_SECRET||'').length>=24&&env.SESSION_SECRET!==env.APP_PASSWORD);
check('DATA_DIR on a persistent writable location',Boolean(env.DATA_DIR)&&path.resolve(env.DATA_DIR)!==path.resolve(root,'data'),'production','Keep account and order data outside deploy artifacts.');
check('HTTPS cookies',env.COOKIE_SECURE==='true','production','Required with HTTPS production hosting.');
check('PUBLIC_BASE_URL is a valid https:// origin',/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(env.PUBLIC_BASE_URL||''),'production');
for(const file of ['server.js','core/studio-v15.js','core/signup-captcha-v101.js','core/v101-expansion.js','config/open-source-registry-v101.json','public/brand/fezi-rabbit-f.png'])check('File '+file,fs.existsSync(path.join(root,file)));
const integrations={
 email:{configured:present('RESEND_API_KEY')&&present('EMAIL_FROM'),verifiedDelivery:false},
 googleOAuth:{configured:false,implementation:'not-installed'},
 appleOAuth:{configured:false,implementation:'not-installed'},
 aiChat:{configured:present('AI_API_KEY')||present('OPENROUTER_API_KEY')||present('OPENAI_API_KEY'),verifiedInference:false},
 telegram:{configured:present('TELEGRAM_BOT_TOKEN'),verifiedDelivery:false},
 arinaGPU:{configured:present('FEZI_GPU_WORKER_URL')||present('AVATAR_WORKER_URL'),verifiedRender:false},
 youtubeStream:{configured:present('YOUTUBE_RTMP_KEY'),verifiedLive:false},
 instagramStream:{configured:present('INSTAGRAM_RTMP_URL'),verifiedLive:false},
 cryptoCheckout:{configured:false,reason:'No verified chain processor/receipt matcher is wired to the marketplace; credit and delivery disabled.'},
 modelCatalog:{registered:289,verifiedInstalls:0}
};
const output={release:'1.01',checks,requiredPassed:checks.filter(x=>x.category==='required').every(x=>x.ok),productionReady:checks.every(x=>x.ok)&&integrations.cryptoCheckout.configured,integrations,notes:['This preflight cannot prove GPU/OAuth/payment/streaming connectivity.','Never put keys or passwords in GitHub, chat or frontend bundles.','API credit quotes and product orders cannot be settled until a verified payment system is deployed.']};
process.stdout.write(JSON.stringify(output,null,2)+'\n');
if(!output.requiredPassed)process.exitCode=1;
