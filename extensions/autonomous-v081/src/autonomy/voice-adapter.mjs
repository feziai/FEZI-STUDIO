export function createVoiceTranscriber({endpoint=process.env.FEZI_WHISPER_OPENAI_URL,token=process.env.FEZI_WHISPER_TOKEN,model='whisper-1',fetcher=fetch,maxBytes=15*1024*1024}={}){
  return async function transcribe(bytes,{mimeType='audio/webm',filename='recording.webm'}={}){
    if(!endpoint)throw new Error('Local Whisper-compatible endpoint is not configured');
    const u=new URL(endpoint);
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('Invalid Whisper endpoint');
    const b=Buffer.from(bytes);if(!b.length||b.length>maxBytes)throw new Error('Audio file size is invalid');
    if(!['audio/webm','audio/wav','audio/mpeg','audio/mp4','audio/ogg'].includes(mimeType))throw new Error('Unsupported audio format');
    const data=new FormData();data.set('model',model);data.set('file',new Blob([b],{type:mimeType}),filename);
    const headers=token?{Authorization:`Bearer ${token}`}:{ };
    const res=await fetcher(u,{method:'POST',body:data,headers,signal:AbortSignal.timeout(60000)});
    if(!res.ok)throw new Error('Whisper service error '+res.status);
    const json=await res.json();if(typeof json.text!=='string')throw new Error('No transcription text returned');
    return {text:json.text,model};
  };
}
