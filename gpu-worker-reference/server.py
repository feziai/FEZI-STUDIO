#!/usr/bin/env python3
"""Self-hosted ComfyUI bridge. Zero paid API keys. Requires locally installed GPU, model weights, and exported API workflows.
Only run behind private network / HTTPS reverse proxy; never expose ComfyUI itself to the public Internet.
"""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json, os, hmac, re, uuid

ROOT=Path(__file__).resolve().parent
MODELS=json.loads((ROOT.parent/'config'/'open-models.json').read_text())
APPROVED={m['id']:m for m in MODELS if m['runtime']=='gpu'}
TOKEN=os.getenv('FEZI_GPU_WORKER_TOKEN','')
COMFY=(os.getenv('COMFYUI_URL','http://127.0.0.1:8188')).rstrip('/')
BIND=os.getenv('WORKER_BIND','127.0.0.1')
PORT=int(os.getenv('WORKER_PORT','8055'))


def comfy(path, method='GET', data=None):
    req=Request(COMFY+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Content-Type':'application/json'})
    with urlopen(req,timeout=40) as r: return json.loads(r.read(512_000))

def substitute(obj, values):
    if isinstance(obj,dict): return {k:substitute(v,values) for k,v in obj.items()}
    if isinstance(obj,list): return [substitute(v,values) for v in obj]
    if isinstance(obj,str) and obj in values:return values[obj]
    return obj

class Handler(BaseHTTPRequestHandler):
    def respond(self, status, x):
        b=json.dumps(x).encode()
        self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b)
    def authorized(self):
        return bool(TOKEN) and hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+TOKEN)
    def do_GET(self):
        if self.path=='/health':return self.respond(200,{'ok':True,'backend':'ComfyUI private bridge','authenticated':bool(TOKEN),'workflowCount':len(list((ROOT/'workflows').glob('*.json'))),'gpuReadyNotVerified':True})
        if not self.authorized():return self.respond(401,{'error':'Unauthorized'})
        m=re.fullmatch(r'/jobs/([A-Za-z0-9_-]{6,100})',self.path)
        if not m:return self.respond(404,{'error':'Not found'})
        try:
            job_id=m.group(1);record=comfy('/history/'+job_id)
            entry=record.get(job_id) if isinstance(record,dict) else None
            if not entry:return self.respond(200,{'jobId':job_id,'state':'queued','outputs':[]})
            output=[]
            for node in (entry.get('outputs') or {}).values():
                for group in ['images','gifs','videos','audio']:
                    for e in node.get(group,[]) if isinstance(node,dict) else []:
                        if isinstance(e,dict): output.append({'name':e.get('filename',''), 'mime':'video/mp4' if str(e.get('filename','')).lower().endswith('.mp4') else 'application/octet-stream', 'approved':False})
            status=entry.get('status',{})
            state='completed' if status.get('completed') else 'failed' if status.get('status_str')=='error' else 'running'
            return self.respond(200,{'jobId':job_id,'state':state,'outputs':output})
        except Exception as e:return self.respond(502,{'error':'ComfyUI history lookup failed','detail':str(e)[:150]})
    def do_POST(self):
        if not self.authorized():return self.respond(401,{'error':'Unauthorized'})
        if self.path!='/jobs':return self.respond(404,{'error':'Not found'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n<2 or n>32768:return self.respond(413,{'error':'Payload too large or absent'})
            x=json.loads(self.rfile.read(n))
            m=APPROVED.get(x.get('modelId'))
            if not m or m['hfRepo'] != x.get('modelRepo'):return self.respond(400,{'error':'Unapproved model identifier'})
            if x.get('task') not in ['image','video','animate']:return self.respond(400,{'error':'Unsupported task'})
            file=ROOT/'workflows'/(m['id']+'.json')
            if not file.exists():return self.respond(503,{'error':'Workflow missing. Export API JSON from ComfyUI for '+m['id']+' and install licensed weights first.'})
            workflow=json.loads(file.read_text())
            ref=x.get('referenceAsset') or ''
            if ref and (not re.fullmatch('arina/[A-Za-z0-9_./-]{1,160}',ref) or '..' in ref):return self.respond(400,{'error':'Bad reference path'})
            values={'__FEZI_PROMPT__':x.get('prompt',''), '__FEZI_REF_IMAGE__':ref.split('/')[-1], '__FEZI_DURATION_SEC__':int(x.get('durationSec',8)),'__FEZI_LORA_ID__':x.get('loraId') or ''}
            job=substitute(workflow,values)
            result=comfy('/prompt','POST',{'prompt':job,'client_id':str(uuid.uuid4())})
            if result.get('error'):return self.respond(422,{'error':'ComfyUI refused workflow'})
            pid=result.get('prompt_id')
            if not pid:return self.respond(502,{'error':'No ComfyUI prompt id'})
            return self.respond(202,{'jobId':pid,'state':'queued'})
        except HTTPError as ex:return self.respond(502,{'error':'ComfyUI HTTP '+str(ex.code)})
        except Exception as ex:return self.respond(500,{'error':'Worker request failed','detail':str(ex)[:120]})

if __name__=='__main__':
    if not TOKEN or len(TOKEN)<32:raise SystemExit('FEZI_GPU_WORKER_TOKEN must be configured to >=32 random characters')
    if BIND not in ('localhost','127.0.0.1','::1'):
        print('WARNING: use a secure HTTPS reverse proxy and firewall; do not expose GPU worker publicly')
    ThreadingHTTPServer((BIND,PORT),Handler).serve_forever()
