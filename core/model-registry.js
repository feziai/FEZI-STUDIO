/** FEZI AGENT 0.77 — 15 *additional* verified, permissively licensed AI model choices.
 * FEZI AGENT already carried three GGUF choices from v0.6; the catalog
 * preserves those as BASE_MODELS rather than double counting them.
 * These records describe upstream models. They do NOT mean model weights or
 * compute runtimes are installed, reachable, or benchmarked. Do not bundle
 * third-party weights or remove upstream notices.
 */
const entry=(id,role,hf,license,runtime,localId=null,requirements='')=>Object.freeze({
  id,role,repository:hf,url:`https://huggingface.co/${hf}`,license,runtime,localId,requirements
});
export const BASE_MODELS=Object.freeze([
  entry('quick-code','code_quick','Qwen/Qwen2.5-Coder-0.5B-Instruct','Apache-2.0','ollama','qwen2.5-coder:0.5b','small CPU machine'),
  entry('code-editor','code_edit','Qwen/Qwen2.5-Coder-1.5B-Instruct','Apache-2.0','ollama','qwen2.5-coder:1.5b','small or medium RAM'),
  entry('persian-chat','general','Qwen/Qwen3-0.6B','Apache-2.0','ollama','qwen3:0.6b','small CPU machine')
]);
/** These 15 are additional to the preexisting three models above. */
export const SPECIALISTS=Object.freeze([
  entry('project-coder','code_complex','Qwen/Qwen2.5-Coder-7B-Instruct','Apache-2.0','ollama','qwen2.5-coder:7b','medium to large RAM'),
  entry('reviewer','code_review','Qwen/Qwen2.5-Coder-14B-Instruct','Apache-2.0','ollama','qwen2.5-coder:14b','large RAM/GPU'),
  entry('translate','translation','Qwen/Qwen3-1.7B','Apache-2.0','ollama','qwen3:1.7b','medium RAM'),
  entry('planner','planning','Qwen/Qwen3-4B','Apache-2.0','ollama','qwen3:4b','medium RAM'),
  entry('advanced-chat','general_advanced','Qwen/Qwen3-8B','Apache-2.0','ollama','qwen3:8b','larger RAM'),
  entry('reasoner','reasoning','deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B','MIT','ollama','deepseek-r1:1.5b','medium RAM'),
  entry('documents','document_summary','ibm-granite/granite-3.3-2b-instruct','Apache-2.0','ollama','granite3.3:2b','medium RAM'),
  entry('short-summary','summarization','HuggingFaceTB/SmolLM3-3B','Apache-2.0','ollama','smollm3:3b','medium RAM; multilingual limits'),
  entry('document-vision','ocr','PaddlePaddle/PaddleOCR-VL','Apache-2.0','worker',null,'Python OCR runtime'),
  entry('semantic-search','embedding','BAAI/bge-m3','MIT','worker',null,'vector index runtime'),
  entry('search-rerank','rerank','BAAI/bge-reranker-v2-m3','Apache-2.0','worker',null,'reranker runtime'),
  entry('speech-recognition','speech_to_text','openai/whisper-small','Apache-2.0','worker',null,'audio runtime'),
  entry('voice','text_to_speech','hexgrad/Kokoro-82M','Apache-2.0','worker',null,'TTS runtime'),
  entry('image-generator','image','black-forest-labs/FLUX.1-schnell','Apache-2.0','worker',null,'GPU, large model weights'),
  entry('video-generator','video','Wan-AI/Wan2.1-T2V-1.3B','Apache-2.0','worker',null,'GPU, full repository > 10 GB')
]);
export const ALL_MODELS=Object.freeze([...BASE_MODELS,...SPECIALISTS]);
export const SPECIALIST_ROLES=Object.freeze([...new Set(ALL_MODELS.map(m=>m.role))]);
export function roleForRequest(prompt=''){
  const s=String(prompt).toLowerCase();
  if(/(ویدیو|فیلم بساز|text.to.video|generate video|render video|movie clip)/i.test(s))return 'video';
  if(/(متن به گفتار|صدای مصنوعی|بخوان|text.to.speech|synthesize speech)/i.test(s))return 'text_to_speech';
  if(/(صدا به متن|پیاده سازی صوت|رونویسی صوت|transcribe audio|speech.to.text)/i.test(s))return 'speech_to_text';
  if(/(ocr|استخراج متن از عکس|متن تصویر|scan document|extract text from image)/i.test(s))return 'ocr';
  if(/(رتبه بندی نتایج|rerank|re.rank|ترتیب نتایج)/i.test(s))return 'rerank';
  if(/(جستجوی معنایی|semantic search|embeddings?|بازیابی دانش)/i.test(s))return 'embedding';
  if(/(تصویر بساز|ساخت عکس|پوستر بساز|generate image|create image|text.to.image)/i.test(s))return 'image';
  if(/(بازبینی کد|بازبینی برنامه|code review|review my code)/i.test(s))return 'code_review';
  if(/(رفع خطا|خطا را رفع|اصلاح خطا|اصلاح باگ|refactor|debug|fix bug)/i.test(s))return 'code_edit';
  if(/(سایت کامل|اپلیکیشن کامل|پروژه کامل|full.stack|whole app|entire project)/i.test(s))return 'code_complex';
  if(/(کد ساده|script|snippet|قطعه کد)/i.test(s))return 'code_quick';
  if(/(خلاصه سند|document summary|summarize document)/i.test(s))return 'document_summary';
  if(/(خلاصه متن|summarize text|text summary)/i.test(s))return 'summarization';
  if(/(پاسخ مفصل|long.form answer|detailed general answer)/i.test(s))return 'general_advanced';
  if(/(ترجمه|translate|translation)/i.test(s))return 'translation';
  if(/(استدلال|reason|تحلیل پیچیده|logic puzzle)/i.test(s))return 'reasoning';
  if(/(برنامه ریزی|plan|نقشه راه|steps to build)/i.test(s))return 'planning';
  return 'general';
}
/** Only chooses an exact model which is confirmed installed in Ollama.
 * Registry membership alone is never treated as availability.
 */
export function chooseInstalledSpecialist(role,ollamaModels=[]){
  if(!SPECIALIST_ROLES.includes(role))return null;
  if(!Array.isArray(ollamaModels))return null;
  const installed=new Set(ollamaModels.filter(x=>typeof x==='string'));
  const preferred=ALL_MODELS.find(x=>x.role===role&&x.runtime==='ollama'&&installed.has(x.localId));
  if(preferred)return preferred;
  if(['code_quick','code_edit','code_complex'].includes(role)){
    const related=['project-coder','code-editor','quick-code'].map(id=>ALL_MODELS.find(x=>x.id===id));
    return related.find(x=>installed.has(x.localId))||null;
  }
  return null;
}
export function catalogSummary(){return {brand:'FEZI AGENT',version:'0.77.0',availableRoles:SPECIALIST_ROLES.length,registeredModels:ALL_MODELS.length,newModels:SPECIALISTS.length,existingModels:BASE_MODELS.length,modelWeightsBundled:false,executionRequiresInstalledRuntime:true};}
