import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTelegramChannel,arinaChannelAnnouncement,ARINA_BOT_COMMANDS} from '../core/arina-telegram-channel.js';

test('channel ID must be explicitly configured and valid',()=>{
  assert.equal(normalizeTelegramChannel('@arina_fm_bot'), '@arina_fm_bot');
  assert.equal(normalizeTelegramChannel('-1001234567890'), '-1001234567890');
  for(const bad of ['', '@x','-123','https://t.me/somechannel','@hello world'])assert.throws(()=>normalizeTelegramChannel(bad));
});
test('public channel card links to video mini app, not private Telegram web_app button',()=>{
  const item=arinaChannelAnnouncement('https://studio.example');
  assert.match(item.text,/ضبط‌شده/);
  assert.equal(item.reply_markup.inline_keyboard[0][0].url,'https://studio.example/arina-live');
  assert.ok(item.reply_markup.inline_keyboard.every(row=>row.every(button=>button.url && !button.web_app)));
  assert.throws(()=>arinaChannelAnnouncement('http://localhost:3000'));
});
test('Arina bot commands include live, radio and account in separate bot',()=>{
  const ids=ARINA_BOT_COMMANDS.map(x=>x.command);
  for(const cmd of ['start','live','chat','radio','clips','account','status'])assert.ok(ids.includes(cmd));
  assert.equal(new Set(ids).size,ids.length);
});
