#!/usr/bin/env node
/** Live encoder operator script, OFF by default. No shell interpolation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const configPath=path.join(root,'config','arina-approved-stream.json');
const raw=await fs.readFile(configPath,'utf8');const cfg=JSON.parse(raw);
const clips=cfg.approvedClips||[];
function secretUrl(kind){if(kind==='youtube'){const key=process.env.YOUTUBE_RTMP_KEY||'';return key.length>14?'rtmps://a.rtmps.youtube.com/live2/'+key:null}const u=process.env.INSTAGRAM_RTMP_URL||'';return /^rtmps:\/\/[a-zA-Z0-9._-]+(?:\/[^\s]*)?$/.test(u)?u:null}
const ready=clips.length>0&&clips.every(x=>/^[a-zA-Z0-9._-]+\.mp4$/.test(x));
const urls=[secretUrl('youtube'),secretUrl('instagram')].filter(Boolean);
const stats={approvedClips:clips.length,allFilenamesSafe:ready,youtubeConfigured:!!secretUrl('youtube'),instagramConfigured:!!secretUrl('instagram'),musicRightsRequired:true,source:'pre-rendered approved clips only',streamingActive:false};
if(!process.argv.includes('--run')){console.log(JSON.stringify(stats,null,2));console.log('To broadcast use --run and both ARINA_STREAM_ENABLED=true and ARINA_CONFIRM_BROADCAST=YES.');process.exit(0)}
if(process.env.ARINA_STREAM_ENABLED!=='true'||process.env.ARINA_CONFIRM_BROADCAST!=='YES')throw Error('Live broadcast requires explicit operator approval');
if(!ready||!urls.length)throw Error('Approve actual MP4 clips and configure YouTube/Instagram RTMPS in private environment');
if(clips.some(x=>x.startsWith('cpu-photo-preview')))throw Error('CPU still preview is not an approved live-performance clip');
const videoFolder=path.join(root,'public','arina-live','assets','video');
for(const name of clips){const st=await fs.stat(path.join(videoFolder,name));if(!st.isFile()||st.size<1000)throw Error('Missing approved video: '+name)}
const temp=path.join(root,'data','arina-stream-playlist-v101.txt');await fs.mkdir(path.dirname(temp),{recursive:true,mode:0o700});await fs.writeFile(temp,clips.map(name=>"file '"+path.join(videoFolder,name)+"'").join('\n')+'\n',{mode:0o600});
// FFmpeg tee targets; tokens are not printed or written to disk.
const output=urls.map(x=>'[f=flv:onfail=ignore]'+x).join('|');
const args=['-hide_banner','-nostdin','-re','-stream_loop','-1','-f','concat','-safe','0','-i',temp,'-map','0:v:0','-map','0:a:0?','-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p','-c:v','libx264','-preset','veryfast','-b:v','2800k','-maxrate','3500k','-bufsize','7000k','-g','60','-c:a','aac','-b:a','128k','-ar','44100','-f','tee',output];
console.log('Launching approved Arina broadcast encoder. Destinations configured:',urls.length,'(keys hidden)');
const child=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe'],env:process.env});
child.stderr.on('data',data=>{const str=String(data).replace(/rtmps?:\/\/\S+/g,'[redacted-stream-destination]');process.stderr.write(str.slice(-1000))});
process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGINT'));child.on('close',code=>process.exitCode=code||0);
