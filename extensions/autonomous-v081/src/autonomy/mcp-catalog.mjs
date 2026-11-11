// A proposed 70-entry catalog, NOT 70 active MCP servers. Operators must supply server URLs,
// credentials, capability allowlists and verification tests before activation.
const categories={
  coding:['github','gitlab','git','filesystem','terminal'],
  deployment:['docker','kubernetes','vercel','netlify','cloudflare'],
  databases:['postgres','sqlite','mysql','redis','mongodb'],
  knowledge:['notion','confluence','obsidian','wikidata','vector-search'],
  search:['brave-search','tavily','exa','browser-search','site-crawler'],
  browser:['playwright','puppeteer','browserbase','screenshot','lighthouse'],
  design:['figma','canva','image-inspection','svg-tools','design-tokens'],
  media:['comfyui','ffmpeg','transcription','captioning','media-library'],
  communication:['telegram','gmail','slack','discord','matrix'],
  productivity:['linear','jira','trello','calendar','todo'],
  analytics:['prometheus','grafana','clickhouse','analytics','experiment-tracking'],
  machinelearning:['ollama','huggingface','mlflow','model-registry','evaluation'],
  ecommerce:['stripe','shopify','woocommerce','catalog-search','invoicing'],
  security:['secret-store','dependency-audit','sbom','vulnerability-check','audit-logs']
};
export const mcpCatalog=Object.freeze(Object.entries(categories).flatMap(([category,names])=>names.map(name=>({
  id:`${category}/${name}`,category,name,transport:'stdio-or-http',enabled:false,verified:false,endpoint:null,
  status:'template-only',requiresAdminApproval:true
}))));
if(mcpCatalog.length!==70)throw new Error('Expected 70 catalog entries');
export function verifyMcpConfig(entry){
  if(!entry?.enabled)return {usable:false,reason:'disabled'};
  if(!entry?.verified)return {usable:false,reason:'not-verified'};
  if(!entry?.endpoint)return {usable:false,reason:'missing-endpoint'};
  return {usable:true};
}
