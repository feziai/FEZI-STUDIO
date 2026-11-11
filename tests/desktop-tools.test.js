import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync,spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {desktopCatalog,desktopTool,validateEditorId,createDesktopWorkspace} from '../core/desktop-tools.js';

test('ten confirmed opensource desktop developer tools appear in registry',()=>{
 const list=desktopCatalog();assert.equal(list.length,10);assert.equal(new Set(list.map(x=>x.id)).size,10);
 for(const x of list){assert.match(x.repo,/^https:\/\/github\.com\//);assert.ok(x.license);assert.ok(x.launchMode);}
 assert.equal(desktopTool('aider').kind,'agent');assert.equal(desktopTool('code-server').kind,'browser');
 assert.equal(desktopTool('NOT-EXIST'),null);assert.throws(()=>validateEditorId('../oops'),/Unknown/);
});
test('workspace export preserves user files and creates editor instructions',()=>{
 const project={id:'0123456789abcdef',name:'مغازه من'};
 const files={'index.html':'<html>ok</html>','js/app.js':'console.log("hi")','AGENTS.md':'user supplied'};
 const result=createDesktopWorkspace(files,project);
 assert.equal(result['index.html'],files['index.html']);
 assert.equal(result['AGENTS.md'],files['AGENTS.md']);
 assert.ok(result['FEZI-EDITOR-README.md'].includes('FEZI AGENT'));
 assert.ok(JSON.parse(result['.vscode/settings.json'])['editor.formatOnSave']);
 assert.equal(JSON.parse(result['.fezi-agent/desktop-integrations.json']).editors.length,10);
 assert.throws(()=>createDesktopWorkspace([]),/Invalid project files/);
});
test('launcher refuses unknown app, relative path and agent launch without consent',async t=>{
 const here=await fs.mkdtemp(path.join(os.tmpdir(),'fezi-editor-test-'));
 t.after(()=>fs.rm(here,{force:true,recursive:true}));
 const launch=(...args)=>spawnSync(process.execPath,['scripts/desktop-launch.mjs',...args],{cwd:path.resolve(''),encoding:'utf8'});
 assert.match(launch('--list').stdout,/vscodium/);
 assert.notEqual(launch('--tool','fake','--project',here).status,0);
 assert.notEqual(launch('--tool','vscodium','--project','relative').status,0);
 const agent=launch('--tool','aider','--project',here);
 assert.notEqual(agent.status,0);
 assert.match(agent.stderr,/confirm-agent/);
 const browser=launch('--tool','code-server','--project',here);
 assert.notEqual(browser.status,0);
 assert.match(browser.stderr,/separate authenticated service/);
});
