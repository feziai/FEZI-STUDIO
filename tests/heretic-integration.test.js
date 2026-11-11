import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHereticAdapter,modelIdValid} from '../core/heretic-adapter.mjs';
test('Heretic validates HF model identifiers against command injection',()=>{
 assert.equal(modelIdValid('Qwen/Qwen3-4B-Instruct-2507'),true);
 for(const s of ['--help','../../etc/passwd','Qwen/model;echo hi','Qwen/model --unsafe','Qwen/..','Qwen/\\evil','Qwen/model\n'])assert.equal(modelIdValid(s),false,s);
});
test('Heretic remains unavailable unless explicitly configured on server',async()=>{
 const tool=createHereticAdapter({env:{HERETIC_ENABLED:'false',HERETIC_ALLOWED_MODELS:'Qwen/Qwen3-4B-Instruct-2507',HERETIC_CLI_PATH:'/missing/heretic'}});
 const st=await tool.status();
 assert.equal(st.ready,false);assert.deepEqual(st.allowedModels,['Qwen/Qwen3-4B-Instruct-2507']);
 assert.equal(st.capability.notSupported.includes('hosted video generators'),true);
 await assert.rejects(()=>tool.launch('Qwen/Qwen3-4B-Instruct-2507'),/not installed/);
});
test('Heretic prevents arbitrary model launches',async()=>{
 const tool=createHereticAdapter({env:{HERETIC_ENABLED:'true',HERETIC_ALLOWED_MODELS:'Qwen/Qwen3-4B-Instruct-2507',HERETIC_CLI_PATH:'/bin/echo'}});
 await assert.rejects(()=>tool.launch('Other/secret'),/allowlist/);
});
