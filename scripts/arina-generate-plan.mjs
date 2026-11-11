#!/usr/bin/env node
import {writeFile,mkdir} from 'node:fs/promises';
import {planDance,DANCE_MOVES} from '../core/arina-dance-director.js';
import path from 'node:path';
const prompt=process.argv.slice(2).join(' ')||'رقص فان آرینا';
const durationSeconds=/120|دو دقیقه|2 minutes|۲ دقیقه/.test(prompt)?120:60;
const plan=planDance({prompt,durationSeconds});
const folder=path.resolve('render-jobs');await mkdir(folder,{recursive:true});
const target=path.join(folder,`arina-${plan.category}-${durationSeconds}s.json`);
await writeFile(target,JSON.stringify(plan,null,2)+'\n');
console.log(`Wrote ${target}: ${plan.segments.length} pose-matched video segments / ${DANCE_MOVES.length} choreographic move definitions. Not rendered videos.`);
