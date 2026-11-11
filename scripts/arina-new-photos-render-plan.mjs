#!/usr/bin/env node
/** Prepare offline GPU worker jobs from original single-photo references.
 * Never claims footage has been rendered. Requires motion-driving footage and
 * a local/remote GPU model. Neither stock storyboard tiles nor cross-fading
 * static portraits count as generated continuous animation.
 */
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const actions=[
 ['idle','arina-08','gentle breathing, blinking, subtle head and hair motion',8],
 ['reading','arina-08','eyes glance to chat, thoughtful head movement',8],
 ['typing','arina-08','hands type smoothly, shoulders and eyes track screen',8],
 ['laugh','arina-01','happy laugh, slight head tilt, return to neutral',8],
 ['wink','arina-03','natural wink and relaxed smile, return to neutral',6],
 ['rabbit-hat','arina-01','play with plush rabbit ear hat, soft expression',8],
 ['strawberry','arina-02','pick up a strawberry and take a small bite; natural hand contact',8],
 ['milkshake','arina-09','hold milkshake, take a sip, gently set down',8],
 ['thank-you','arina-02','warm grateful hand-to-heart gesture',8],
 ['dance-fun','arina-03','comedic trendy playful dance with changing groove and beat sync',120],
 ['dance-iranian','arina-10','Iranian-inspired cheerful dance with smooth turns and natural arm motion',120],
 ['dance-pop','arina-10','contemporary upbeat pop dance, no foot sliding',120],
 ['dance-cute','arina-03','heart hands and finger-heart gestures while dancing',60],
 ['dance-groove','arina-08','laid-back groove with smooth shoulder and head rhythm',60],
 ['dance-energetic','arina-10','energetic full-body choreography and seamless transitions',120]
];
const jobs=actions.map(([id,reference,description,seconds],i)=>({
 id:'arina-job-'+String(i+1).padStart(2,'0'),motion:id,referencePortrait:`private/arina-gallery/${reference}.webp`,
 referencePublic:reference==='arina-01'||reference==='arina-02'||reference==='arina-03'||reference==='arina-08'||reference==='arina-09'||reference==='arina-10'?`public/arina-gallery/full/${reference}.webp`:null,
 requirement:'identity-consistent full-motion video; locked camera; stable background and outfit; no morphing or jump cuts',
 positivePrompt:description,negativePrompt:'identity drift, wardrobe drift, inconsistent hands, extra fingers, frame jumps, slideshow, still-frame crop, camera shake, flicker, image tiles, change of face',
 fps:30,width:1920,height:1080,targetSeconds:seconds,
 referenceMotionRequired:true,pairedMotionFile:null,
 startPose:'neutral',endPose:'neutral',
 renderEngineHint:'Wan2.2 Animate motion transfer via compatible ComfyUI GPU worker',
 assetReady:false,reviewed:false,published:false
}));
const dir=path.join(root,'render-jobs');await mkdir(dir,{recursive:true});
const name=path.join(dir,'arina-new-single-photos-15-gpu-jobs.json');await writeFile(name,JSON.stringify({referenceSet:'10 uploaded individual Arina photos Nov 01 2026',generatedAt:'2026-11-01',requiresGpu:true,videoGenerated:false,notes:'This is a job list; real motion-guides and authorized GPU renderer needed. Video is not yet available.',jobs},null,2)+'\n');console.log(`Created ${jobs.length} pending real-video jobs at ${name}`);
