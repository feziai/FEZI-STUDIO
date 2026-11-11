import {BASE_MODELS,SPECIALISTS} from '../core/model-registry.js';
console.log('FEZI AGENT 0.77 — optional models; no weights bundled, no automatic downloads.');
console.log('3 existing models: '+BASE_MODELS.map(m=>m.repository).join(', '));
for(const m of SPECIALISTS)console.log(`${m.role.padEnd(19)} ${m.repository.padEnd(57)} ${m.license.padEnd(11)} ${m.runtime}${m.localId?' | ollama pull '+m.localId:''}`);
