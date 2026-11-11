import {toolboxHostDoctor,toolboxSummary} from '../core/fezi-toolbox.js';
const state=await toolboxHostDoctor();
console.log(JSON.stringify({toolbox:toolboxSummary(),host:state},null,2));
