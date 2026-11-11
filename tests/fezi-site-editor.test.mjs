import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeziSiteEditor} from '../core/fezi-site-editor.mjs';
const projectId='0123456789abcdef';
function harness({failBackup=false}={}){
 let count=0, backups=0;
 const files={'index.html':'<h1>FEZI Studio</h1><p>Welcome</p>','style.css':'body {color: blue;}','.env':'SECRET_TOKEN=private'};
 const editor=createFeziSiteEditor({
  metadata:async id=>{assert.equal(id,projectId);return {id}},
  scanFiles:async()=>({...files}),
  saveFiles:async(_id,changes)=>{count++;for(const c of changes)files[c.path]=c.content},
  checkpoint:async()=>{if(failBackup)throw Error('Checkpoint failed');backups++;return {id:'cp001'}}
 });
 return{editor,files,get count(){return count},get backups(){return backups}};
}
test('read lists only eligible project text paths',async()=>{
 const h=harness();const data=await h.editor.read({projectId});
 assert.equal(data.siteType,'fezi_studio_self_hosted');
 assert.ok(data.paths.includes('index.html'));
 assert.ok(!data.paths.includes('.env'));
 const f=await h.editor.read({projectId,path:'index.html'});
 assert.equal(f.content,h.files['index.html']);assert.match(f.sha256,/^[a-f0-9]{64}$/);
});
test('preview never saves, then apply checkpoints and saves after approval',async()=>{
 const h=harness();
 const args={projectId,path:'index.html',find:'FEZI Studio',replace:'FEZI Website Controller'};
 const p=await h.editor.preview(args);
 assert.equal(h.count,0);assert.equal(p.stage,'preview_only');
 await assert.rejects(()=>h.editor.apply({...args,expectedSha256:p.expectedSha256}),/Explicit owner approval/);
 const applied=await h.editor.apply({...args,expectedSha256:p.expectedSha256,confirm:true});
 assert.equal(h.count,1);assert.equal(h.backups,1);
 assert.match(h.files['index.html'],/FEZI Website Controller/);
 assert.equal(applied.deployed,false);assert.equal(applied.testsRun,false);
});
test('stale preview blocks edits',async()=>{
 const h=harness();const args={projectId,path:'index.html',find:'Welcome',replace:'Hello'};
 const p=await h.editor.preview(args);
 h.files['index.html']='<h1>new content</h1>';
 await assert.rejects(()=>h.editor.apply({...args,expectedSha256:p.expectedSha256,confirm:true}),/changed since preview/);
 assert.equal(h.count,0);
});
test('multiple find matches rejected',async()=>{
 const h=harness();h.files['index.html']='x x x';
 await assert.rejects(()=>h.editor.preview({projectId,path:'index.html',find:'x',replace:'y'}),/more than once/);
});
test('path traversal, sensitive and executable paths rejected',async()=>{
 const h=harness();const p={projectId,find:'a',replace:'b'};
 for(const path of ['../../secret.txt','/etc/passwd','.env','foo/.env.production','data/credentials.json','foo.exe','foo\\bar.html']){
  await assert.rejects(()=>h.editor.preview({...p,path}),/path|configuration|file types/i,path);
 }
});
test('failed checkpoint blocks write',async()=>{
 const h=harness({failBackup:true});const args={projectId,path:'style.css',find:'blue',replace:'red'};
 const p=await h.editor.preview(args);
 await assert.rejects(()=>h.editor.apply({...args,expectedSha256:p.expectedSha256,confirm:true}),/Checkpoint failed/);
 assert.equal(h.count,0);
});
test('edit without text and no-op edits rejected',async()=>{
 const h=harness();
 await assert.rejects(()=>h.editor.preview({projectId,path:'index.html',find:'',replace:'a'}),/exact old text/);
 await assert.rejects(()=>h.editor.preview({projectId,path:'index.html',find:'abc',replace:'abc'}),/no changes/);
});
