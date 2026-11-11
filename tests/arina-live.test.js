import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyArina,demoResponse,validateArinaMessage,MOTIONS} from '../core/arina-live.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const samples=[
 ['برقص آرینا','dance'],['Can you dance?','dance'],['یه قلب با دستات بساز','heart'],['send a heart','heart'],
 ['لطفا چشمک بزن','wink'],['wink at us','wink'],['مرسی بابت لایو','thanks'],['thank you','thanks'],
 ['بخند و خوشحال باش','happy'],['you are funny lol','happy'],['روی کیبورد تایپ کن','typing'],['type a reply','typing'],
 ['این پیام رو بخون','reading'],['به نظرت چطور میشه؟','thinking'],['سلام آرینا','reading']
];
for(const [text,expect] of samples)test('Arina interaction: '+text,()=>{assert.equal(classifyArina(text),expect);assert.ok(demoResponse(text,expect).length>4)});
test('valid text has safe nickname',()=>assert.deepEqual(validateArinaMessage({message:'سلام',nickname:'Sara_A'}),{text:'سلام',nickname:'Sara_A'}));
for(const bad of ['','x'.repeat(601)])test('invalid length rejected '+bad.length,()=>assert.throws(()=>validateArinaMessage({message:bad,nickname:'Guest'})));
test('HTML-like nickname rejected',()=>assert.throws(()=>validateArinaMessage({message:'hello',nickname:'<img onerror=1>'})));
test('voice recording controls are available but synthesized speech is not claimed',async()=>{const h=await fs.readFile(path.join(root,'public/arina-live/index.html'),'utf8');assert.doesNotMatch(h,/speechSynthesis|گفتار آزمایشی/);for(const id of ['startRecord','pauseRecord','stopRecord','cancelRecord','mediaPicker'])assert.match(h,new RegExp('id=\"'+id+'\"'))});
test('all motion states have frames',async()=>{const m=JSON.parse(await fs.readFile(path.join(root,'public/arina-live/assets/storyboard-manifest.json'),'utf8'));for(const name of MOTIONS){assert.equal(m.states[name].frames.length,10);for(const asset of m.states[name].frames){await fs.access(path.join(root,'public',asset))}}assert.equal(m.realVideoGenerated,false)});
