#!/usr/bin/env node
// Strict high-confidence secret scan for GitHub release. Never echo detected values.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['.git','node_modules','data','private','secrets','plugin-hub/runtime-private']);
const highRiskNames=[/^\.env$/i,/^\.env\.[^.]+$/i,/^Dotenv\.txt$/i,/\.(p12|pem|p8|key|keystore|jks)$/i,/\.(sqlite|sqlite3|db)$/i,/^id_(rsa|ed25519)$/i];
const sensitive=[/github_pat_[a-zA-Z0-9_]{45,}/g,/ghp_[A-Za-z0-9]{36}/g,/sk-or-v1-[0-9a-f]{48,}/gi,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,/mongodb(?:\+srv)?:\/\/[^\s:\/@]+:[^\s@]+@/gi,/\b\d{8,12}:[A-Za-z0-9_-]{35}\b/g];
const textExt=new Set(['.js','.mjs','.cjs','.ts','.py','.json','.yml','.yaml','.md','.html','.css','.txt','.sh','.toml','.ini','.xml','.csv','.env','.example']);
let checked=0;const violations=[];
function scan(folder,rel=''){
 for(const e of fs.readdirSync(folder,{withFileTypes:true})){
  const sub=path.posix.join(rel,e.name);
  if(e.isSymbolicLink()){violations.push({path:sub,reason:'symbolic link not allowed'});continue}
  if(e.isDirectory()){
   if(ignored.has(e.name) || sub.startsWith('private-plugin-exports') || sub.startsWith('private/')){
    // Private runtime directories are gitignored and must also be excluded from release ZIPs.
    continue;
   }
   scan(path.join(folder,e.name),sub);continue;
  }
  if(!e.isFile())continue;
  if(e.name!=='.env.example'&&highRiskNames.some(rx=>rx.test(e.name)))violations.push({path:sub,reason:'sensitive filename'});
  const ext=path.extname(e.name).toLowerCase();if(!textExt.has(ext)&&!['.gitignore','.dockerignore'].includes(e.name))continue;
  const stat=fs.statSync(path.join(folder,e.name));if(stat.size>8_000_000)continue;
  const s=fs.readFileSync(path.join(folder,e.name),'utf8');checked++;
  for(const rx of sensitive){rx.lastIndex=0;if(rx.test(s))violations.push({path:sub,reason:'credential-shaped content detected'});}
 }
}
scan(root);
if(violations.length){
 console.error(`PUBLIC RELEASE SAFETY CHECK FAILED: ${violations.length} issue(s), ${checked} text files inspected.`);
 for(const v of violations.slice(0,30)) console.error(`${v.path}: ${v.reason}`);
 process.exit(1);
}
console.log(`PUBLIC RELEASE SAFETY CHECK PASSED: ${checked} text files inspected, no detected credential patterns.`);
