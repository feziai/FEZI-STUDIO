import fs from 'node:fs';
const reg=JSON.parse(fs.readFileSync('public/plugins/registry.json','utf8'));
const names=new Set();let missing=[];
for(const p of reg.plugins){if(names.has(p.slug))throw Error('Duplicate '+p.slug);names.add(p.slug);const f=`plugin-hub/plugins/${p.slug}/manifest.json`;if(!fs.existsSync(f))missing.push(f);else {const m=JSON.parse(fs.readFileSync(f,'utf8'));if(m.chatgptPluginId!==p.chatgpt.pluginId)throw Error('Mismatch '+p.slug)}}
if(reg.plugins.length!==25||missing.length)throw Error('Registry error '+JSON.stringify({count:reg.plugins.length,missing}));
console.log('Verified 25 private plugin entries and 25 GitHub manifests; live MCP upstreams not asserted.');
