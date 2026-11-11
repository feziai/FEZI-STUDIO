import test from 'node:test';import assert from 'node:assert/strict';import {makeTelegramPluginFiles,brandedTelegramText} from '../core/telegram-plugin-hub.mjs';
test('exports all Telegram framework files without embedded tokens',()=>{
 for(const engine of ['native','grammy','telegraf','aiogram']){
  const files=makeTelegramPluginFiles({name:'FEZI test bot',welcome:'Hi',fallback:'help',engine,commands:[{command:'helpme',reply:'Contact us'}]});
  assert.ok(files['plugin.json']);assert.ok(engine==='aiogram'?files['bot.py']:files['bot.mjs']);assert.equal(JSON.parse(files['plugin.json']).engine,engine);assert.ok(!JSON.stringify(files).includes('github_pat_'));assert.ok(JSON.stringify(files).includes('FEZI Studio'));
 }
});
test('branded reply appends website without hiding bot response',()=>{
 assert.match(brandedTelegramText('Hello','https://fezi.app'),/Hello/);assert.match(brandedTelegramText('Hello','https://fezi.app'),/FEZI Studio.*fezi\.app/);
 assert.doesNotMatch(brandedTelegramText('Hello','javascript:alert(1)'),/javascript/);
});
