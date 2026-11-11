/** Desktop IDE integration catalog. No external executable is bundled or auto-installed. */
const IDE_CATALOG = Object.freeze([
  {id:'vscodium',name:'VSCodium',kind:'desktop',role:'full-featured desktop IDE',license:'MIT',repo:'https://github.com/VSCodium/vscodium',commands:['codium','vscodium']},
  {id:'theia',name:'Eclipse Theia IDE',kind:'desktop',role:'customizable IDE',license:'MIT (theia-ide)',repo:'https://github.com/eclipse-theia/theia-ide',commands:['theia','theia-ide']},
  {id:'code-server',name:'code-server',kind:'browser',role:'self-hosted browser IDE',license:'MIT',repo:'https://github.com/coder/code-server',commands:['code-server']},
  {id:'zed',name:'Zed',kind:'desktop',role:'fast collaborative editor',license:'GPL-3.0-or-later / Apache-2.0',repo:'https://github.com/zed-industries/zed',commands:['zed']},
  {id:'lapce',name:'Lapce',kind:'desktop',role:'lightweight native editor',license:'Apache-2.0',repo:'https://github.com/lapce/lapce',commands:['lapce']},
  {id:'neovim',name:'Neovim',kind:'terminal',role:'scriptable terminal editor',license:'Apache-2.0 + Vim-derived portions',repo:'https://github.com/neovim/neovim',commands:['nvim']},
  {id:'helix',name:'Helix',kind:'terminal',role:'LSP-aware modal editor',license:'MPL-2.0',repo:'https://github.com/helix-editor/helix',commands:['hx']},
  {id:'pulsar',name:'Pulsar',kind:'desktop',role:'customizable desktop code editor',license:'MIT',repo:'https://github.com/pulsar-edit/pulsar',commands:['pulsar']},
  {id:'opencode',name:'OpenCode',kind:'agent',role:'external coding agent',license:'MIT',repo:'https://github.com/anomalyco/opencode',commands:['opencode']},
  {id:'aider',name:'Aider',kind:'agent',role:'Git-aware coding agent',license:'Apache-2.0',repo:'https://github.com/Aider-AI/aider',commands:['aider']},
]);

export function desktopCatalog(){return IDE_CATALOG.map(({commands,...x})=>({...x,launchMode:x.kind==='browser'?'separate-service':'installed-on-user-computer'}));}
export function desktopTool(id){return IDE_CATALOG.find(x=>x.id===id)||null;}
export function validateEditorId(id){const selected=desktopTool(id);if(!selected)throw Object.assign(new Error('Unknown desktop tool'),{status:400});return selected;}
export function createDesktopWorkspace(files,metadata={}){
  if(!files||typeof files!=='object'||Array.isArray(files))throw new TypeError('Invalid project files');
  const title=String(metadata.name||'Project').replace(/[\x00-\x1f]/g,'').slice(0,60);
  // Export only config, not a duplicate or downloaded copy of any upstream IDE.
  const additions={
    'FEZI-EDITOR-README.md':`# FEZI AGENT — ${title}\n\nThis is your editable project, exported for any installed code editor.\n\n1. Extract this ZIP to a directory on your own PC.\n2. Open the directory in VSCodium, Theia, Zed, Lapce, Pulsar, Neovim or Helix.\n3. Install OpenCode or Aider separately to use a terminal coding agent. Check its model configuration and costs first.\n4. Keep credentials in local environment variables, never in exported project files.\n5. For code-server on a host, use a separately authenticated server and a shared project directory.\n\nNo third-party IDE binary or model weights are included.\n`,
    'AGENTS.md':`# FEZI AGENT workspace guidance\n\n- Use FEZI AGENT as the product name in user-facing copy.\n- Understand Persian and English requests.\n- Inspect project files before modifying them. Preserve unrelated features.\n- Run available tests and distinguish verified work from proposed changes.\n- Do not publish or deploy without explicit authorization.\n- Never commit secrets, private keys or .env files.\n`,
    '.vscode/settings.json':JSON.stringify({'files.autoSave':'afterDelay','editor.formatOnSave':true,'editor.tabSize':2,'files.exclude':{'**/.git':true,'**/node_modules':true}},null,2)+'\n',
    '.fezi-agent/desktop-integrations.json':JSON.stringify({schema:1,brand:'FEZI AGENT',projectId:metadata.id||null,editors:IDE_CATALOG.map(x=>({id:x.id,kind:x.kind,repository:x.repo})),note:'Tools are optional and are not installed by this export'},null,2)+'\n'
  };
  // Preserve user-provided project files on collision.
  return {...additions,...files};
}
