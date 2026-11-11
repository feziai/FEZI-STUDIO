import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const run=(script,args=[],env={})=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,encoding:'utf8',env:{...process.env,TELEGRAM_BOT_TOKEN:'',TELEGRAM_ALLOWED_USER_IDS:'',...env}});
test('GitHub publisher validates release without GitHub credentials in dry run',()=>{
 const a=run('publish-github.mjs',['--dry-run']);assert.equal(a.status,0);const result=JSON.parse(a.stdout);
 assert.equal(result.ready,true);assert.equal(result.target,'feziai/FEZI-AGENT');assert.equal(result.remoteWrites,false);
});
test('GitHub publisher requires explicit confirmation before modifying remote',()=>{
 const a=run('publish-github.mjs');assert.notEqual(a.status,0);assert.match(a.stderr,/--confirm/);
});
test('Telegram preflight reports missing BotFather credentials without leaking tokens',()=>{
 const a=run('telegram-preflight.mjs');assert.equal(a.status,2);const result=JSON.parse(a.stdout);
 assert.equal(result.botTokenConfigured,false);assert.equal(result.readyForPolling,false);
});
test('Telegram preflight validates local polling setup without contacting Telegram',()=>{
 const a=run('telegram-preflight.mjs',[],{TELEGRAM_BOT_TOKEN:'123456789:'+'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',TELEGRAM_ALLOWED_USER_IDS:'123456789',TELEGRAM_MODE:'polling'});
 assert.equal(a.status,0);const result=JSON.parse(a.stdout);assert.equal(result.readyForPolling,true);assert.equal(result.telegramConnected,false);
 assert.ok(!a.stdout.includes('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'));
});
