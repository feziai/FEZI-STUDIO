import fs from 'node:fs';
const publicCatalog=JSON.parse(fs.readFileSync('public/plugins/registry.json','utf8'));
const hub=JSON.parse(fs.readFileSync('plugin-hub/registry.json','utf8'));
const publicBySlug=new Map(publicCatalog.plugins.map(plugin=>[plugin.slug,plugin]));
const seen=new Set();
for(const plugin of hub.plugins){
  if(seen.has(plugin.slug))throw Error(`Duplicate hub slug: ${plugin.slug}`);
  seen.add(plugin.slug);
  const publicProfile=publicBySlug.get(plugin.slug);
  if(!publicProfile)throw Error(`Hub plugin is missing from the public catalog: ${plugin.slug}`);
  if(plugin.pluginId!==publicProfile.chatgpt.pluginId)throw Error(`Hub registry ID mismatch: ${plugin.slug}`);
  const manifestPath=`plugin-hub/plugins/${plugin.slug}/manifest.json`;
  if(!fs.existsSync(manifestPath))throw Error(`Missing hub manifest: ${manifestPath}`);
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.chatgptPluginId!==publicProfile.chatgpt.pluginId)throw Error(`Hub manifest ID mismatch: ${plugin.slug}`);
}
const catalogOnly=publicCatalog.plugins.filter(plugin=>!seen.has(plugin.slug));
for(const plugin of catalogOnly){
  if(plugin.chatgpt.access!=='private'||plugin.chatgpt.publicReady!==false||plugin.mcp.endpoint!==null)
    throw Error(`Catalog-only entry claims a public or active runtime: ${plugin.slug}`);
}
console.log(`Verified ${hub.plugins.length} private hub manifests; ${catalogOnly.length} public catalog-only profile(s) have no claimed runtime.`);
