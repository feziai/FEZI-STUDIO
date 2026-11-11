#!/usr/bin/env node
/** Explicit LOCAL launcher for already installed editors. Never execute this through remote HTTP routes. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {desktopTool,desktopCatalog} from '../core/desktop-tools.js';

const args=process.argv.slice(2);
function flag(x){const i=args.indexOf(x);return i<0?undefined:args[i+1];}
function executableExists(name,env=process.env){
  const exts=process.platform==='win32' ? (env.PATHEXT||'.EXE;.CMD;.BAT').split(';') : [''];
  for(const part of (env.PATH||'').split(path.delimiter)){
    if(!part)continue;
    for(const ext of exts){const candidate=path.join(part,name+ext);try{if(fs.statSync(candidate).isFile()){fs.accessSync(candidate,fs.constants.X_OK);return candidate;}}catch{}}
  }
  return null;
}
if(args.includes('--help')||args.length===0){console.log('Usage: node scripts/desktop-launch.mjs --list | --tool vscodium --project /absolute/path [--confirm-agent]');process.exit(0);}
if(args.includes('--list')){for(const tool of desktopCatalog()){
  const original=desktopTool(tool.id);const executable=original.commands.map(executableExists).find(Boolean);
  console.log(`${tool.id.padEnd(13)} ${executable?'installed: '+executable:'not detected'} (${tool.kind})`);
}process.exit(0);}
const id=flag('--tool'),project=flag('--project');
const tool=desktopTool(id);
if(!tool)throw new Error('Unknown editor ID');
if(!project||!path.isAbsolute(project))throw new Error('--project must be an absolute local path');
const folder=fs.realpathSync(project);
if(!fs.statSync(folder).isDirectory())throw new Error('Project must be a directory');
if(tool.kind==='browser')throw new Error('code-server uses a separate authenticated service. See compose.editor.yaml');
if(tool.kind==='agent'&&!args.includes('--confirm-agent'))throw new Error('Agent may change files or spend tokens. Retry with --confirm-agent to explicitly launch it.');
const bin=tool.commands.map(executableExists).find(Boolean);
if(!bin)throw new Error(`${tool.id} is not installed or unavailable in PATH`);
// cwd is a known directory and the executable/argv are allowlisted; no shell interpretation.
const child=spawn(bin,tool.kind==='agent'?[]:[folder],{cwd:folder,stdio:'inherit',shell:false,env:process.env});
child.on('error',error=>{console.error('Editor launch failed:',error.message);process.exitCode=1;});
child.on('exit',(code,signal)=>{if(code!==null)process.exitCode=code;else if(signal)process.exitCode=1;});
