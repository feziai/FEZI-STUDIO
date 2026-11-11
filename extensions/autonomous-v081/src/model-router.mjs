// FEZI AGENT: deterministic, auditable task-aware routing engine.
// Model metadata and quality metrics MUST be supplied by measured provider health/evals.
// No API calls are made by this module. No hidden provider privilege or bypass.
export const TASKS = Object.freeze([
  'chat','reasoning','code','debug','repo-edit','vision','image','video','motion',
  'speech-to-text','text-to-speech','embeddings','game','android','web'
]);
const clamp = (v, lo=0, hi=1) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : lo));
const norm = s => String(s??'').toLowerCase().trim();
const DEFAULT_WEIGHTS = Object.freeze({quality:.30,reliability:.18,taskFit:.17,latency:.09,cost:.08,privacy:.06,context:.05,availability:.05,throughput:.02});
const PRIORITIES = {
  'reasoning':{quality:.39,reliability:.20,taskFit:.18,latency:.04,cost:.03,privacy:.04,context:.07,availability:.04,throughput:.01},
  'code':{quality:.34,reliability:.20,taskFit:.20,latency:.07,cost:.04,privacy:.05,context:.04,availability:.05,throughput:.01},
  'debug':{quality:.37,reliability:.21,taskFit:.19,latency:.05,cost:.03,privacy:.05,context:.05,availability:.04,throughput:.01},
  'motion':{quality:.37,reliability:.23,taskFit:.22,latency:.04,cost:.04,privacy:.02,context:.02,availability:.05,throughput:.01},
  'video':{quality:.38,reliability:.21,taskFit:.23,latency:.04,cost:.05,privacy:.02,context:.01,availability:.05,throughput:.01}
};
export function classifyTask(input={}) {
  if (input.task && TASKS.includes(input.task)) return input.task;
  const prompt=norm(input.prompt);
  const matches=[
    [/ویدیو|فیلم|video|cinematic|animate|انیمیشن/, 'video'],
    [/حرکت آرینا|motion|storyboard|رقص/, 'motion'],
    [/عکس|تصویر|image|illustrat|پوستر/, 'image'],
    [/باگ|debug|خطا|error|stack trace/, 'debug'],
    [/اندروید|apk|android/, 'android'],
    [/بازی|game|godot/, 'game'],
    [/وبسایت|وب سایت|webapp|website|frontend/, 'web'],
    [/کد|برنامه نویسی|code|typescript|python|javascript/, 'code'],
    [/استدلال|ریزنینگ|reason|اثبات|منطق/, 'reasoning'],
    [/صدا به متن|transcrib|whisper/, 'speech-to-text'],
    [/متن به صدا|tts|voice synthesis/, 'text-to-speech']
  ];
  return matches.find(([regex])=>regex.test(prompt))?.[1]??'chat';
}
function constraints(model, request) {
  const issues=[];
  const t=request.task;
  if (!Array.isArray(model.tasks)|| !model.tasks.includes(t)) issues.push('missing-capability');
  if (model.enabled===false) issues.push('disabled');
  if (model.ready!==true) issues.push('not-ready');
  if (model.health==='down') issues.push('unhealthy');
  if (model.licenseApproved!==true) issues.push('unapproved-license');
  if (model.policyPermitted===false) issues.push('policy-restricted');
  if (model.regionAllowed===false) issues.push('region-restricted');
  if (model.circuitOpen===true) issues.push('circuit-open');
  if (request.offlineOnly && !model.local) issues.push('offline-required');
  if (request.dataLocalOnly && !model.local) issues.push('privacy-requires-local');
  if (request.minContextTokens && (model.contextTokens??0)<request.minContextTokens) issues.push('insufficient-context');
  if (request.requiredVramGb!=null && (model.availableVramGb??0)<request.requiredVramGb) issues.push('insufficient-vram');
  if (model.vramRequiredGb && (model.availableVramGb??0)<model.vramRequiredGb) issues.push('insufficient-vram');
  if (request.maxPricePerUnit != null && (model.pricePerUnit??Infinity)>request.maxPricePerUnit) issues.push('over-budget');
  if (request.manualModelId && model.id!==request.manualModelId) issues.push('not-selected');
  if (request.requiredFeatures?.some(feature=>!model.features?.includes(feature))) issues.push('missing-feature');
  return [...new Set(issues)];
}
function score(model, request) {
  const w=PRIORITIES[request.task]??DEFAULT_WEIGHTS;
  const metrics={
    quality:clamp(model.evals?.[request.task]??model.quality??0.5),
    reliability:clamp(model.reliability??0.5),
    taskFit:clamp(model.taskFit?.[request.task]??0.5),
    latency:clamp(1/(1+(model.latencyMs??3000)/3000)),
    cost:clamp(1/(1+(model.pricePerUnit??0)/Math.max(request.costScale??0.001,0.000001))),
    privacy:clamp(model.local?1:(model.privacyScore??0.4)),
    context:clamp(request.minContextTokens? (model.contextTokens??0)/request.minContextTokens : (model.contextTokens??8192)/32768),
    availability:clamp(model.availability??0.7),
    throughput:clamp((model.throughput??25)/100)
  };
  const contributions=Object.fromEntries(Object.entries(w).map(([k,weight])=>[k,Math.round(weight*metrics[k]*10000)/100]));
  const raw=Object.values(contributions).reduce((a,b)=>a+b,0);
  const uncertainty=clamp(model.metricsConfidence??0.5);
  // Conservative confidence shrinkage: unknown or poorly measured candidates don't dominate.
  return {score: Math.round((raw*uncertainty + 45*(1-uncertainty))*100)/100,
          metrics,contributions,confidence:uncertainty};
}
export function routeModel(input, catalog) {
  const request={...input,task:classifyTask(input)};
  if (!Array.isArray(catalog)) throw new TypeError('catalog must be an array');
  // For image and video, UI must provide explicit manualModelId; no AI-selected model.
  if (['image','video','motion'].includes(request.task) && !request.manualModelId)
    return {task:request.task,selected:null,alternatives:[],blockedReason:'manual-model-selection-required'};
  const evaluated=catalog.map(model=>{
    const blocked=constraints(model,request);
    return {id:model.id,provider:model.provider,blocked,...score(model,request)};
  });
  const eligible=evaluated.filter(x=>!x.blocked.length).sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id)));
  return {task:request.task,selected:eligible[0]??null,alternatives:eligible.slice(1,4),rejected:evaluated.filter(x=>x.blocked.length).map(x=>({id:x.id,reasons:x.blocked})),
    blockedReason:eligible.length?null:'no-eligible-model',
    policy:'Use authorized models only; on failure retry at most once then choose next available eligible candidate.'};
}
export function executionPlan(input,catalog) {
  const request={...input,task:classifyTask(input)};
  const sequence = ['web','android','game','repo-edit'].includes(request.task)
   ? ['reasoning','code','debug'] : [request.task];
  return sequence.map(task=>({step:task,...routeModel({...request,task},catalog)}));
}
