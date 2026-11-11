#!/usr/bin/env python3
"""Create short ORIGINAL royalty-unencumbered instrumental background loops.
Not copies of named songs, and not meant to replace licensed commercial tracks.
"""
import subprocess, wave, os, sys
from pathlib import Path
import numpy as np
FS=22050
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/arina-live/assets/audio'
OUT.mkdir(parents=True,exist_ok=True)

# A minor pentatonic supports both groove and common 6/8-style passages.
SCALES=[220.0,261.63,293.66,329.63,392.0,440.0,523.25]

def tone(t, freq, dur, flavor):
    x=np.maximum(0,t); gate=np.maximum(0,1-np.clip(x/dur,0,1))
    attack=np.minimum(1,x/.012)
    if flavor=='pluck':
        return (.64*np.sin(2*np.pi*freq*x)+.21*np.sin(2*np.pi*freq*2*x)+.10*np.sin(2*np.pi*freq*3*x))*np.exp(-5*x/max(.14,dur))*attack
    return .7*np.sin(2*np.pi*freq*x)*gate*attack

def create(filename,bpm,beats_per_measure,pattern):
    measures=12
    beat=60/bpm
    seconds=measures*beats_per_measure*beat
    data=np.zeros(int(seconds*FS),dtype=np.float64)
    rng=np.random.default_rng(bpm)
    def put(start,dur,fn):
        if start>=seconds:return
        a=int(start*FS); b=min(len(data),a+int(dur*FS));
        if b<=a:return
        t=np.arange(b-a)/FS
        data[a:b]+=fn(t)
    for i in range(measures*beats_per_measure):
        sec=i*beat
        pos=i%beats_per_measure
        strong=pos==0
        if strong or pos in ([3] if beats_per_measure==6 else [2]):
            put(sec,.35,lambda t: .42*np.sin(2*np.pi*(72*np.exp(-t*22))*t)*np.exp(-18*t))
        if pos in ([2,5] if beats_per_measure==6 else [1,3]):
            put(sec,.18,lambda t: .16*rng.normal(0,1,len(t))*np.exp(-28*t))
        put(sec,.095,lambda t: .045*rng.normal(0,1,len(t))*np.exp(-54*t))
        if strong:
            f=[110,130.8,146.8,98][(i//beats_per_measure)%4]
            put(sec,.40,lambda t,f=f: .20*tone(t,f,.4,'bass'))
        if pos in pattern:
            idx=(i//beats_per_measure*2 + pos)%len(SCALES)
            f=SCALES[idx]
            put(sec+min(beat*.12,.07),beat*.7,lambda t,f=f: .19*tone(t,f,beat*.7,'pluck'))
    # tiny fixed room echo, soft tanh limit to eliminate clipping
    tail=int(.17*FS); data[tail:]+=data[:-tail]*.08
    data=np.tanh(data*1.3)*.83
    wav=OUT/(filename+'.wav'); mp3=OUT/(filename+'.mp3')
    with wave.open(str(wav),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(FS)
        w.writeframes((data*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(mp3)],check=True)
    wav.unlink()
    print(mp3.name,'bpm',bpm,'seconds',round(seconds,2))

create('arina-persian-original-108bpm',108,6,[0,2,4])
create('arina-fun-original-120bpm',120,4,[0,1,2,3])
create('arina-pop-original-128bpm',128,4,[0,2,3])
create('arina-calm-original-92bpm',92,4,[0,2])
