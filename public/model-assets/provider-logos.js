/** Local FEZI provider identity badges. These are FEZI-made icons, not official vendor logos. */
const PROVIDERS = [
 ['fezi',/fezi\s*(agent|studio)|^auto$/i],['openrouter',/openrouter|open.router/i],['ollama',/ollama/i],
 ['openai',/openai|chatgpt|\bgpt[- ]|codex/i],['gemini',/gemini|google ai/i],['grok',/grok|xai|x\.ai/i],
 ['mistral',/mistral|mixtral|codestral|devstral/i],['huggingface',/hugging.face|hf.space/i],
 ['qwen',/qwen/i],['llama',/llama|meta ai/i],['deepseek',/deepseek/i],['gemma',/gemma/i],
 ['wan',/\bwan\d|wan\s*2/i],['ltx',/\bltx/i],['flux',/flux/i],['stable',/stable.diffusion|sdxl|stability/i],
 ['comfyui',/comfyui/i],['cline',/cline/i],['opencode',/opencode/i],['openhands',/openhands/i],
 ['aider',/aider/i],['whisper',/whisper/i],['suno',/suno/i],['runway',/runway/i]
];
export function iconForModel(model){
 const str=[model?.name,model?.id,model?.slug,model?.source,model?.provider].filter(Boolean).join(' ');
 let type=PROVIDERS.find(([_,pattern])=>pattern.test(str))?.[0];
 if(!type){type=({image:'image',video:'video',code:'code',coding:'code'})[model?.task||model?.category]||'generic';}
 return `/model-assets/icons/${type}.svg`;
}
export function makeModelIcon(model,{size=42}={}){
 const img=document.createElement('img');img.className='fezi-model-logo';img.src=iconForModel(model);
 img.alt=`${model?.name||'AI'} icon`;img.loading='lazy';img.width=size;img.height=size;
 img.onerror=()=>{if(!img.dataset.fallback){img.dataset.fallback='1';img.src='/model-assets/icons/generic.svg'}};
 return img;
}
