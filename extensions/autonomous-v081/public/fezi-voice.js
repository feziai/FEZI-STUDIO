// ES module frontend integration for FEZI AGENT chat; requires a real authenticated API endpoint.
export function attachVoiceRecorder({button,sendAudio,onStatus=()=>{}}){
  let recorder,stream,chunks=[];
  button.addEventListener('click',async()=>{
    if(recorder?.state==='recording') {recorder.stop();return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){onStatus('Microphone recording unsupported');return;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':undefined;
      recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      chunks=[];
      recorder.addEventListener('dataavailable',e=>{if(e.data.size)chunks.push(e.data)});
      recorder.addEventListener('stop',async()=>{
        stream.getTracks().forEach(t=>t.stop());
        try{onStatus('Transcribing...');await sendAudio(new Blob(chunks,{type:recorder.mimeType||'audio/webm'}));onStatus('Done')}
        catch(e){onStatus('Transcription error: '+e.message)}
      },{once:true});
      recorder.start();onStatus('Recording');
    }catch(e){stream?.getTracks().forEach(t=>t.stop());onStatus('Microphone permission required')}
  });
}
