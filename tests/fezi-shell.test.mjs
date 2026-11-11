import test from 'node:test';import assert from 'node:assert/strict';
import {runAgentShell,allowedAgentShellActions} from '../core/fezi-agent-shell.mjs';
test('shell disabled by default and arbitrary commands rejected',async()=>{
 await assert.rejects(runAgentShell('node-version',{root:process.cwd()}),{status:403});
 await assert.rejects(runAgentShell('rm -rf /',{root:process.cwd(),enabled:true}),{status:400});
 assert.ok(allowedAgentShellActions().includes('git-status'));
});
test('whitelisted diagnostic never uses shell interpreter',async()=>{
 let invoked=false;const result=await runAgentShell('node-version',{root:process.cwd(),enabled:true,executor:async(cmd,args,opts)=>{invoked=true;assert.equal(opts.shell,false);assert.equal(args[0],'--version');return {stdout:'v22.0.0',stderr:''}}});
 assert.equal(invoked,true);assert.equal(result.ok,true);assert.match(result.output,/v22/);
});
