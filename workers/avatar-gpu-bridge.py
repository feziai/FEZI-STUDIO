#!/usr/bin/env python3
"""Small authenticated adapter for a separately installed GPU video generator.

It DOES NOT include a pretrained video model. Configure AVATAR_RENDER_COMMAND_JSON
with a trusted fixed argv template that accepts {image}, {audio}, {output}.
Example: ["python", "/opt/your-adapter/render.py", "--image", "{image}",
          "--audio", "{audio}", "--output", "{output}"]
No shell evaluation or arbitrary user commands are permitted.
"""
import base64, hmac, json, os, pathlib, subprocess, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

TOKEN=os.environ.get('AVATAR_WORKER_TOKEN','')
COMMAND=os.environ.get('AVATAR_RENDER_COMMAND_JSON','')
HOST=os.environ.get('AVATAR_BRIDGE_HOST','127.0.0.1')
PORT=int(os.environ.get('AVATAR_BRIDGE_PORT','8099'))
MAX_BODY=20_000_000
MAX_OUTPUT=40_000_000
GPU_SLOT=threading.BoundedSemaphore(1)

def valid_config():
    try:
        args=json.loads(COMMAND)
        return bool(TOKEN and len(TOKEN)>=16 and isinstance(args,list) and len(args)>0 and
                all(isinstance(x,str) for x in args) and
                all(any('{'+k+'}' in a for a in args) for k in ('image','audio','output')))
    except Exception: return False

class Handler(BaseHTTPRequestHandler):
    def log_message(self,fmt,*args): pass # Never log media or secrets.
    def reply(self,status,msg):
        body=json.dumps({'error':msg}).encode();self.send_response(status)
        self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_POST(self):
        if urlsplit(self.path).path!='/render':return self.reply(404,'Not found')
        bearer='Bearer '+TOKEN
        if not TOKEN or not hmac.compare_digest(self.headers.get('Authorization',''),bearer):return self.reply(401,'Unauthorized')
        if not valid_config():return self.reply(503,'GPU renderer command not configured')
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n<64 or n>MAX_BODY:return self.reply(413,'Invalid request size')
            payload=json.loads(self.rfile.read(n));
            im=base64.b64decode(payload['image_base64'],validate=True);audio=base64.b64decode(payload['audio_base64'],validate=True)
            it=payload['image_mime'];at=payload['audio_mime']
            if it not in ('image/png','image/jpeg','image/webp') or at not in ('audio/wav','audio/mpeg','audio/ogg','audio/webm','audio/mp4'):
                return self.reply(400,'Invalid mime')
            if len(im)>8_000_000 or len(audio)>6_000_000:return self.reply(413,'Media too large')
            if not GPU_SLOT.acquire(blocking=False):return self.reply(429,'GPU Worker busy')
            try:
                with tempfile.TemporaryDirectory(prefix='fezi-avatar-') as tmp:
                    image=pathlib.Path(tmp)/('source.'+{'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[it])
                    voice=pathlib.Path(tmp)/('voice.'+{'audio/wav':'wav','audio/mpeg':'mp3','audio/ogg':'ogg','audio/webm':'webm','audio/mp4':'m4a'}[at])
                    output=pathlib.Path(tmp)/'final.mp4';image.write_bytes(im);voice.write_bytes(audio)
                    vars={'image':str(image),'audio':str(voice),'output':str(output)}
                    argv=[a.format_map(vars) for a in json.loads(COMMAND)]
                    result=subprocess.run(argv,cwd=tmp,timeout=180,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=False)
                    if result.returncode:return self.reply(502,'GPU rendering process failed')
                    if not output.is_file() or output.stat().st_size>MAX_OUTPUT:return self.reply(502,'No valid output')
                    video=output.read_bytes()
                    if len(video)<16 or video[4:8]!=b'ftyp':return self.reply(502,'Output is not MP4')
                    self.send_response(200);self.send_header('Content-Type','video/mp4');self.send_header('Content-Length',str(len(video)))
                    self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(video)
            finally: GPU_SLOT.release()
        except (ValueError,KeyError,TypeError,base64.binascii.Error):self.reply(400,'Invalid payload')
        except subprocess.TimeoutExpired:self.reply(504,'GPU rendering timed out')
        except BrokenPipeError:pass
        except Exception:self.reply(500,'GPU worker error')

if __name__=='__main__':
    if not valid_config():raise SystemExit('Configure AVATAR_WORKER_TOKEN and AVATAR_RENDER_COMMAND_JSON first.')
    print(f'FEZI AGENT GPU bridge on {HOST}:{PORT}; keep behind HTTPS proxy or local tunnel')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
