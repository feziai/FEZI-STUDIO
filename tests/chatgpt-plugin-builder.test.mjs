import test from 'node:test';import assert from 'node:assert/strict';
import {makeChatGPTPluginFiles,normalizeChatGPTPlugin} from '../core/chatgpt-plugin-builder.mjs';
const input={name:'FEZI Model Helper',purpose:'Help people inspect and install small models safely.',workflow:'Check a model license, size, runtime, and then explain how to install it.'};
test('portable plugin has both manifests and a valid SKILL.md',()=>{const files=makeChatGPTPluginFiles(input);assert.equal(JSON.parse(files['plugin.json']).name,'fezi-model-helper');assert.ok(files['.codex-plugin/plugin.json']);assert.ok(files['skills/fezi-model-helper/SKILL.md'].includes('name: fezi-model-helper'));assert.ok(files['README_FA.md'].includes('Plugin Creator'));});
test('requires meaningful instructions and safe generated paths',()=>{assert.throws(()=>normalizeChatGPTPlugin({...input,workflow:'bad'}),/required/);assert.equal(normalizeChatGPTPlugin({...input,name:'!@#$'}).slug,'fezi-custom-plugin')});
