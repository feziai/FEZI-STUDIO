import test from 'node:test';import assert from 'node:assert/strict';
import {smallModelIds,installSmallModel} from '../core/small-model-installer.mjs';
test('only two allowlisted GGUF models smaller than 320 MB',()=>{assert.deepEqual(smallModelIds(),['smollm2-135m','smollm2-360m'])});
test('blocks unknown downloads before network requests',async()=>{await assert.rejects(installSmallModel('https://example.com/evil'),{status:400})});
