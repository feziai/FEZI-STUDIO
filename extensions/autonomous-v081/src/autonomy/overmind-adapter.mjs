import { spawn } from 'node:child_process';
// Optional local CLI interface. This module never syncs private chat data or starts fine-tuning.
export function overmindAdapter({binary='overmind',enabled=false}={}){
  return {
    enabled,
    async checkInstallation(){
      if(!enabled)return {ready:false,reason:'disabled'};
      return await new Promise(resolve=>{
        const p=spawn(binary,['--version'],{stdio:['ignore','pipe','pipe'],timeout:5000});let output='';
        p.stdout.on('data',d=>output+=String(d).slice(0,1000));
        p.once('error',e=>resolve({ready:false,reason:e.code||e.message}));
        p.once('close',code=>resolve({ready:code===0,version:output.trim().slice(0,100)}));
      });
    },
    integrationPlan(){return {
      mode:'opt-in',steps:['Confirm Overmind project and credentials outside chat','Set project-id in overmind.toml without overwriting existing project','Run overmind sync manually','Enable evaluation and sanitized telemetry','Review eval results before applying patch'],
      uploadRawPrompts:false,automaticDeployment:false,automaticFineTuning:false
    }}
  };
}
