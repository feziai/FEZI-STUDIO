import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('master prompt preserved verbatim in repository',()=>{
 const spec=read('docs/FEZI_STUDIO_MASTER_SPEC_FA.md');
 for(const section of ['FEZI Agent','Telegram Bots','Free AI Models','Autonomous Updates','Additional AI Frameworks','Final Requirements'])assert.ok(spec.includes(section));
 assert.ok(spec.includes('ساخت، ویرایش، نصب، تست و انتشار وب‌سایت'));
});
test('manifest references the existing single website, not a replacement',()=>{
 const m=JSON.parse(read('config/fezi-master-manifest.json'));
 assert.equal(m.runtime.single_website,true);
 assert.equal(m.strict_requirements.secrets_in_git,false);
 for(const p of Object.values(m.modules).map(v=>v.source)) assert.ok(fs.existsSync(path.join(root,p)),p);
});
test('readiness checks produce honest statuses and never echo token values',()=>{
 const sentinel='DO_NOT_PRINT_EXAMPLE_SECRET_0123456789';
 const stdout=execFileSync(process.execPath,['scripts/fezi-master-preflight.mjs','--json'],{
   cwd:root,env:{...process.env,OPENROUTER_API_KEY:sentinel,TELEGRAM_FACTORY_BOT_TOKEN:sentinel,FEZI_AGENT_MCP_TOKEN:sentinel},encoding:'utf8'});
 const data=JSON.parse(stdout);
 assert.ok(Array.isArray(data.checks));
 assert.ok(data.checks.some(c=>c.status==='PLANNED'));
 assert.equal(stdout.includes(sentinel),false);
 assert.equal(data.isDeployed,false);
});
