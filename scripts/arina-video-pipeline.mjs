#!/usr/bin/env node
/** Validate/publish ONLY video clips and assemble approved pose-matched clips.
 * Images and storyboards are NOT used as animation frames.
 * 60/120s 1080p clips must be generated elsewhere (ComfyUI Wan Animate etc).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateVideoSpec} from '../core/arina-dance-director.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const folder=path.join(root,'public/arina-live/assets/video');
const indexFile=path.join(root,'public/arina-live/assets/video-index.json');
const cmd=process.argv[2];
const opts=new Map();for(let i=3;i<process.argv.length;i++){const item=process.argv[i];if(item.startsWith('--')){const value=process.argv[i+1];opts.set(item,value?.startsWith('--')?true:value??true);if(typeof value==='string'&&!value.startsWith('--'))i++}}
function run(program,args,timeout=240000){return new Promise((resolve,reject)=>{const child=spawn(program,args,{stdio:['ignore','pipe','pipe']});let output='',error='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('media command timeout'))},timeout);child.stdout.on('data',b=>output+=b.toString().slice(0,32768));child.stderr.on('data',b=>error+=b.toString().slice(-32768));child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('exit',code=>{clearTimeout(timer);code===0?resolve(output):reject(new Error(error.slice(-1600)||`Exit ${code}`))})})}
async function inspect(input){
  const result=JSON.parse(await run('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,avg_frame_rate,codec_name','-show_entries','format=duration','-of','json',input]));
  const st=result.streams?.[0],fmt=result.format;
  if(!st||!fmt)throw Error('Invalid MP4/video metadata');
  const [num,den]=String(st.avg_frame_rate||'0/1').split('/').map(Number);
  return {width:st.width,height:st.height,fps:num/den,duration:Number(fmt.duration),codec:st.codec_name};
}
function checkPath(x){if(typeof x!=='string'||!x.toLowerCase().endsWith('.mp4'))throw Error('MP4 input required');return path.resolve(x)}
function safeName(x){if(!/^(?:dance-[a-z-]+|idle|reading|typing|thinking|happy|thanks|heart|wink|kiss|return)$/.test(x||''))throw Error('Invalid motion ID');return x}
async function publish(input,motion,confirm){
  safeName(motion);if(confirm!==true)throw Error('Reviewer sign-off required: --reviewed (fixed camera, matching pose, identity stable, smooth joints, appropriate rights)');
  input=checkPath(input);const meta=await inspect(input),quality=validateVideoSpec(meta);
  if(!quality.ok&&motion.startsWith('dance'))throw Error('Video validation failed: '+quality.reason);
  if(!motion.startsWith('dance')&&(meta.width<1920||meta.height<1080||meta.fps<24||meta.duration<1.5||meta.duration>120))throw Error('Non-dance video must be 1080p >=24fps, duration 1.5-120s');
  if(!['h264','hevc'].includes(meta.codec))throw Error('Require H.264 or HEVC video');
  await fs.mkdir(folder,{recursive:true});const name=`${motion}-${motion.startsWith('dance')?(meta.duration>=90?'120s':'60s'):Math.round(meta.duration)+'s'}.mp4`,dest=path.join(folder,name);
  if(path.resolve(input)!==path.resolve(dest))await fs.copyFile(input,dest);
  let index={};try{index=JSON.parse(await fs.readFile(indexFile,'utf8'))}catch{}
  index[motion]=`/arina-live/assets/video/${name}`;
  await fs.writeFile(indexFile,JSON.stringify(index,null,2)+'\n');
  return {motion,uri:index[motion],meta,ready:true,restartRequired:true};
}
async function assemble(manifestPath,outFile){
  const manifest=JSON.parse(await fs.readFile(checkPathJson(manifestPath),'utf8'));
  if(!Array.isArray(manifest.clips)||manifest.clips.length<2)throw Error('At least two real rendered video clips required');
  if(manifest.clips.length>48)throw Error('Too many clips');
  const fade=Number(manifest.crossfadeSeconds??0.5);if(fade<0.3||fade>1.2)throw Error('Crossfade must be 0.3-1.2 seconds');
  const streams=[];
  for(const [i,c] of manifest.clips.entries()){
    if(!c.reviewed||!c.fixedCamera||c.allowedToUse!==true)throw Error(`Clip ${i+1} needs authorization, fixed-camera and continuity review`);
    if(i>0&&manifest.clips[i-1].exitPose!==c.entryPose)throw Error(`Pose continuity broken between ${i} and ${i+1}`);
    const file=checkPath(c.path),spec=await inspect(file),quality=validateInputClip(spec);
    if(!quality.ok)throw Error(`Clip ${i+1}: ${quality.reason}`);
    streams.push({file,duration:spec.duration});
  }
  const expected=streams.reduce((sum,x)=>sum+x.duration,0)-(streams.length-1)*fade;
  if(expected<59.5||expected>120.5)throw Error(`Input timeline yields ${expected.toFixed(2)} seconds, expected 60-120; provide more actual footage`);
  const args=['-hide_banner','-loglevel','error','-y'];for(const s of streams)args.push('-i',s.file);
  const filters=streams.map((s,i)=>`[${i}:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p,settb=AVTB[v${i}]`);
  let last='v0',running=streams[0].duration;
  for(let i=1;i<streams.length;i++){
    const next=`o${i}`;filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${fade}:offset=${(running-fade).toFixed(3)}[${next}]`);
    last=next;running=running+streams[i].duration-fade;
  }
  outFile=checkPath(outFile);await fs.mkdir(path.dirname(outFile),{recursive:true});
  args.push('-filter_complex',filters.join(';'),'-map',`[${last}]`,'-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',outFile);
  await run('ffmpeg',args,60*60*1000);
  const result=await inspect(outFile),quality=validateVideoSpec(result);if(!quality.ok)throw Error('Output failed validation: '+quality.reason);
  return {output:outFile,meta:result,warning:'Optical continuity requires human review; a crossfade does not reconstruct missing body motion'};
}
function validateInputClip(spec){if(spec.width<1920||spec.height<1080||spec.fps<24)return {ok:false,reason:'input must be real >=1080p >=24fps'};if(Math.abs(spec.width/spec.height-16/9)>0.015)return {ok:false,reason:'wrong aspect ratio'};if(spec.duration<=1)return {ok:false,reason:'input too short'};return {ok:true}}
function checkPathJson(x){if(typeof x!=='string'||!x.endsWith('.json'))throw Error('Provide local JSON manifest');return path.resolve(x)}
try{
  let result;
  if(cmd==='inspect')result=await inspect(checkPath(opts.get('--input')));
  else if(cmd==='publish')result=await publish(opts.get('--input'),opts.get('--motion'),opts.get('--reviewed')===true);
  else if(cmd==='assemble')result=await assemble(opts.get('--manifest'),opts.get('--output'));
  else throw Error('Usage: node scripts/arina-video-pipeline.mjs inspect --input clip.mp4 | publish --input full-dance.mp4 --motion dance-fun --reviewed | assemble --manifest clips.json --output full-dance.mp4');
  console.log(JSON.stringify(result,null,2));
}catch(e){console.error(e.message);process.exitCode=1}
