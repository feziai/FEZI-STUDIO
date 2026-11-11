import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {fileName,projectId,isSafeStatic,validateModelName} from '../core/validation.js';
import {publicIp,allowedHost} from '../core/web.js';
import {adapterFile} from '../core/local-models.js';
import {createBuildExport} from '../core/build-export.js';

// This 5,000-case suite is deterministic, checked in as data and exercises real
// code paths. Each case has a separately recorded expected outcome. No network.
const cases=JSON.parse(fs.readFileSync(new URL('./qa-5000-fixtures.json',import.meta.url),'utf8'));
assert.equal(cases.length,5000,'Exactly 5000 independently defined QA cases');
process.env.WEB_IMPORT_ALLOWED_HOSTS=Array.from({length:100},(_,i)=>`host${String(i).padStart(3,'0')}.example.org`).join(',');
for (const [i,c] of cases.entries()) {
  test(`QA5K-${String(i+1).padStart(4,'0')} ${c.category} ${c.variant}`,()=>{
    let fn;
    switch(c.category){
      case 'fileName': fn=()=>fileName(c.input);break;
      case 'projectId': fn=()=>projectId(c.input);break;
      case 'validateModelName':fn=()=>validateModelName(c.input);break;
      case 'adapterFile':fn=()=>adapterFile(c.input);break;
      case 'isSafeStatic':assert.equal(isSafeStatic(c.input),c.accepted,JSON.stringify(c.input));return;
      case 'publicIp':assert.equal(publicIp(c.input),c.accepted,JSON.stringify(c.input));return;
      case 'allowedHost':assert.equal(allowedHost(c.input),c.accepted,JSON.stringify(c.input));return;
      case 'createBuildExport':fn=()=>createBuildExport(c.input.site,{kind:c.input.kind,appId:c.input.appId,projectName:'FEZI QA'});break;
      default:throw Error('Unknown test category: '+c.category);
    }
    if(!c.accepted){assert.throws(fn,undefined,JSON.stringify(c.input));return;}
    const output=fn();
    if(c.category==='createBuildExport'){
      const prefix=c.input.kind==='pwa'?'':'www/';
      assert.ok(output[prefix+'index.html']);
      assert.ok(output[prefix+'manifest.webmanifest']);
      assert.ok(output[prefix+'service-worker.js']);
      const manifest=JSON.parse(output[prefix+'manifest.webmanifest']);
      assert.equal(manifest.display,'standalone');
      assert.match(output[prefix+'index.html'],/service-worker\.js/);
      if(prefix)assert.equal(JSON.parse(output['capacitor.config.json']).appId,c.input.appId);
    }else assert.ok(typeof output==='string' && output.length>0);
  });
}
