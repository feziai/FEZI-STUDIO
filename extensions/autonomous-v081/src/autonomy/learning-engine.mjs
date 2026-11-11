import { readEvents, atomicJSON, readJSON } from './event-store.mjs';

export function aggregatePerformance(events,{minSamples=5}={}){
  const groups=new Map();
  for(const e of events){
    if(!e.model || !e.task)continue;
    const k=e.task+'::'+e.model;
    if(!groups.has(k))groups.set(k,{task:e.task,model:e.model,count:0,successCount:0,totalLatencyMs:0,totalQuality:0});
    const row=groups.get(k);row.count++;row.successCount+=e.success?1:0;
    row.totalLatencyMs+=e.latencyMs||0;row.totalQuality+=e.quality??0.5;
  }
  return [...groups.values()].map(r=>({
    task:r.task,model:r.model,count:r.count,confidence:Math.min(1,r.count/20),
    reliability:Number((r.successCount/r.count).toFixed(4)),
    averageLatencyMs:Math.round(r.totalLatencyMs/r.count),
    quality:Number((r.totalQuality/r.count).toFixed(4)),
    sampleSufficient:r.count>=minSamples
  }));
}
export function improvementProposals(stats,{failureThreshold=0.75,latencyThresholdMs=12000}={}) {
  const items=[];
  for(const x of stats){
    if(!x.sampleSufficient)continue;
    if(x.reliability < failureThreshold)items.push({id:`health-${x.task}-${x.model}`,task:x.task,model:x.model,type:'review-model-health',
      reason:`success rate ${Math.round(x.reliability*100)}%, n=${x.count}`,status:'pending-review'});
    if(x.averageLatencyMs > latencyThresholdMs)items.push({id:`latency-${x.task}-${x.model}`,task:x.task,model:x.model,type:'benchmark-alternatives',
      reason:`average ${x.averageLatencyMs}ms, n=${x.count}`,status:'pending-review'});
  }
  return items;
}
export async function runLearningCycle({eventsPath,reportPath,proposalsPath}){
  const events=await readEvents(eventsPath);
  const stats=aggregatePerformance(events);
  const proposals=improvementProposals(stats);
  const existing=await readJSON(proposalsPath,[]);
  const byId=new Map(existing.map(x=>[x.id,x]));
  for(const p of proposals)if(!byId.has(p.id))byId.set(p.id,p);
  const report={generatedAt:new Date().toISOString(),eventsAnalyzed:events.length,modelsEvaluated:stats.length,stats,proposals:proposals.length,
    note:'Metrics are derived from local events only. This does not train weights, change code, or deploy anything.'};
  await atomicJSON(reportPath,report);await atomicJSON(proposalsPath,[...byId.values()]);
  return report;
}
export function scheduleLearningCycle(args,{intervalMs=6*60*60*1000,onReport=()=>{},onError=()=>{}}={}){
  if(!Number.isFinite(intervalMs)||intervalMs<60000)throw new Error('intervalMs >= 60000 required');
  let active=true;let running=false;
  const tick=async()=>{
    if(!active||running)return;running=true;
    try{onReport(await runLearningCycle(args))}catch(e){onError(e)}finally{running=false}
  };
  void tick(); const timer=setInterval(tick,intervalMs);timer.unref?.();
  return ()=>{active=false;clearInterval(timer)};
}
