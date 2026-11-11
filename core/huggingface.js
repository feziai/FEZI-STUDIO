/** Public Hugging Face discovery; user-owned tokens remain server-side. */
export async function searchHuggingFace(query,{limit=8}={}) {
  if(typeof query!=='string'||query.length<2||query.length>100)throw Object.assign(new Error('Invalid model search'),{status:400});
  const qs=new URLSearchParams({search:query,limit:String(Math.max(1,Math.min(20,limit))),sort:'likes',direction:'-1'});
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
  try {
    const res=await fetch('https://huggingface.co/api/models?'+qs,{headers:{'accept':'application/json','user-agent':'FEZI-Studio/0.4'},signal:ctl.signal});
    if(!res.ok)throw Object.assign(new Error('Hugging Face HTTP '+res.status),{status:502});
    return (await res.json()).map(x=>({id:x.id,downloads:x.downloads,likes:x.likes,pipeline_tag:x.pipeline_tag,private:x.private,gated:x.gated,link:'https://huggingface.co/'+x.id}));
  }finally{clearTimeout(timer);}
}
