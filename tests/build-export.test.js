import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildExport} from '../core/build-export.js';
const site={'index.html':'<!doctype html><html><head></head><body>Hello</body></html>','style.css':'body{color:black}'};
test('PWA source includes manifest and offline registration',()=>{const x=createBuildExport(site,{kind:'pwa',projectName:'Demo'});assert.ok(x['manifest.webmanifest']);assert.ok(x['index.html'].includes('serviceWorker'));assert.ok(x['fezi-icon.svg'].includes('<svg'));});
test('mobile source includes capacitor config, Android workflow, and www',()=>{const x=createBuildExport(site,{kind:'mobile',projectName:'Demo',appId:'ai.fezi.demo'});assert.ok(x['www/index.html']);assert.equal(JSON.parse(x['capacitor.config.json']).appId,'ai.fezi.demo');assert.ok(x['.github/workflows/build-android-apk.yml'].includes('assembleDebug'));});
test('cannot export backend code as a static mobile app',()=>{assert.throws(()=>createBuildExport({'server.js':'hello'},{kind:'mobile'}),/index.html/);});
test('protect app ID, project paths',()=>{assert.throws(()=>createBuildExport(site,{kind:'mobile',appId:'abc'}),/ID/);assert.throws(()=>createBuildExport({'../bad':'x','index.html':site['index.html']},{kind:'pwa'}),/Unsafe/);});

test('PWA offline cache includes local CSS/JS assets and invalidates cache on edits',()=>{
  const starter={'index.html':'<!doctype html><html><head></head><body>FEZI</body></html>','style.css':'body{color:red}','script.js':'console.log(1)'};
  const first=createBuildExport(starter,{kind:'pwa',projectName:'Test'});
  assert.ok(first['service-worker.js'].includes('style.css'));
  assert.ok(first['service-worker.js'].includes('script.js'));
  assert.ok(first['service-worker.js'].includes('manifest.webmanifest'));
  const second=createBuildExport({...starter,'style.css':'body{color:blue}'},{kind:'pwa',projectName:'Test'});
  assert.notEqual(first['service-worker.js'],second['service-worker.js']);
});
