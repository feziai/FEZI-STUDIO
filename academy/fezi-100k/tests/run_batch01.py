#!/usr/bin/env python3
"""250 reproducible local checks (25 curriculum IDs × 10). No paid APIs or real Telegram/cPanel connection."""
from pathlib import Path
import sys,subprocess,json,os,http.client,time,collections,traceback,math
BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/'examples/python_package'))
sys.path.insert(0,str(BASE/'examples/telegram_bot'))
from taskkit import make_task,summarize,to_json,from_json,Task
from bot import reply_plan,next_offset

IDS=[f'CODE-{i:05d}' for i in range(1,26)]
report={'environment':{'python':sys.version.split()[0]},'lesson_results':{},'total_checks':0,'passed':0,'failed':0,'unexecuted_external':['live Telegram Bot API','deployment to real cPanel hosting','fine-tuning AI model weights'],'notes':'Local fixtures only. Ten checks per lesson reuse scenario fixtures, not 250 independent production integrations.'}
proc=None

def req(port,method,url,payload=None,ctype='application/json'):
 conn=http.client.HTTPConnection('127.0.0.1',port,timeout=3)
 body=(json.dumps(payload,ensure_ascii=False).encode() if not isinstance(payload,(str,bytes)) else (payload.encode() if isinstance(payload,str) else payload)) if payload is not None else None
 conn.request(method,url,body=body,headers=({'Content-Type':ctype} if body is not None else {}))
 res=conn.getresponse();b=res.read();status=res.status;headers=dict(res.getheaders());conn.close()
 return status,json.loads(b.decode()),headers

def checks_python(mid,idx):
 v={'task_id':mid,'title':'FEZI پژوهش '+str(idx),'hours':1+idx/10,'done':False}
 def raises(e,fn):
  try:fn()
  except e:return True
  return False
 return [
 ('valid dictionary becomes typed task',lambda:isinstance(make_task(v),Task)),
 ('Unicode title preserved',lambda:make_task(v).title==v['title']),
 ('numeric hours converted to float',lambda:isinstance(make_task(v).hours,float)),
 ('boolean hours rejected',lambda:raises(ValueError,lambda:make_task({**v,'hours':True}))),
 ('negative hours rejected',lambda:raises(ValueError,lambda:make_task({**v,'hours':-1}))),
 ('missing title rejected',lambda:raises(ValueError,lambda:make_task({k:a for k,a in v.items() if k!='title'}))),
 ('string hours rejected',lambda:raises(ValueError,lambda:make_task({**v,'hours':'5'}))),
 ('summary counts completed tasks',lambda:summarize([make_task(v),make_task({**v,'done':True})])['complete']==1),
 ('JSON round-trip retains task',lambda:from_json(to_json(make_task(v)))==make_task(v)),
 ('extra secret ignored in serialized data',lambda:'topsecret' not in to_json(make_task({**v,'token':'topsecret'}))),
 ]

def checks_node(mid,idx,port):
 value={'title':f'FEZI {mid} – task {idx}','hours':idx}
 return [
 ('health GET returns 200',lambda:req(port,'GET','/health')[0]==200),
 ('health payload ok',lambda:req(port,'GET','/health')[1].get('ok')==True),
 ('unknown route is 404',lambda:req(port,'GET','/missing')[0]==404),
 ('empty list endpoint uses JSON',lambda:isinstance(req(port,'GET','/api/tasks')[1]['tasks'],list)),
 ('valid task accepted',lambda:req(port,'POST','/api/tasks',value)[0]==201),
 ('bad JSON is rejected',lambda:req(port,'POST','/api/tasks','{bad')[0]==400),
 ('bad content type rejected',lambda:req(port,'POST','/api/tasks',value,'text/plain')[0]==415),
 ('negative hours rejected',lambda:req(port,'POST','/api/tasks',{**value,'hours':-2})[0]==422),
 ('valid Unicode title survives',lambda:req(port,'POST','/api/tasks',value)[1]['item']['title']==value['title']),
 ('info endpoint does not expose secrets',lambda:'temporary' not in json.dumps(req(port,'GET','/api/info')[1]).lower()),
 ]

def checks_telegram(mid,idx):
 update=lambda t:{'update_id':idx,'message':{'chat':{'id':1000+idx},'text':t}}
 return [
 ('start responds to same chat',lambda:reply_plan(update('/start'))['chat_id']==1000+idx),
 ('help lists commands',lambda:'/image' in reply_plan(update('/help'))['text']),
 ('image routes to website',lambda:'/studio?category=image' in reply_plan(update('/image'))['text']),
 ('video routes to website',lambda:'/studio?category=video' in reply_plan(update('/video'))['text']),
 ('app routes to builder',lambda:'/builder' in reply_plan(update('/app'))['text']),
 ('Persian message receives Persian answer',lambda:'پیام شما' in reply_plan(update('سلام'))['text']),
 ('missing chat rejected',lambda:reply_plan({'update_id':idx,'message':{'text':'hi'}}) is None),
 ('noninteger chat rejected',lambda:reply_plan({'update_id':idx,'message':{'text':'hi','chat':{'id':'abc'}}}) is None),
 ('too long payload rejected',lambda:reply_plan(update('x'*4097)) is None),
 ('next polling offset deduplicates updates',lambda:next_offset([update('/start'),{'update_id':idx+2}],0)==idx+3),
 ]

try:
 node=os.environ.get('NODE','node')
 proc=subprocess.Popen([node,str(BASE/'examples/node_cpanel/server.mjs')],cwd=BASE,env={**os.environ,'PORT':'0','SENSITIVE_EXAMPLE_SECRET':'temporary-not-public'},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 ready=proc.stdout.readline().strip();port=json.loads(ready)['port']
 report['environment']['node']=subprocess.check_output([node,'--version'],text=True).strip();report['environment']['node_fixture_port']='ephemeral (not persisted)'
 for i,mid in enumerate(IDS,1):
  if i<=10:case='python_package';cases=checks_python(mid,i)
  elif i<=20:case='node_cpanel';cases=checks_node(mid,i,port)
  else:case='telegram_bot';cases=checks_telegram(mid,i)
  results=[]
  for name,fn in cases:
   try:good=(fn() is True);err=''
   except Exception as ex:good=False;err=f'{type(ex).__name__}: {ex}'
   results.append({'name':name,'status':'passed' if good else 'failed',**({'error':err} if err else {})})
  n=sum(x['status']=='passed' for x in results)
  report['lesson_results'][mid]={'scenario':case,'checks':results,'passed':n,'failed':len(results)-n,'status':'drafted','verified_example':n==10,'external_status':'not_run'}
  report['total_checks']+=len(results);report['passed']+=n;report['failed']+=len(results)-n
finally:
 if proc and proc.poll() is None:
  proc.terminate()
  try:proc.wait(timeout=3)
  except subprocess.TimeoutExpired:proc.kill()
report['started_utc']='2026-11-02'
reports=BASE/'reports';reports.mkdir(exist_ok=True)
(reports/'batch01-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'total':report['total_checks'],'passed':report['passed'],'failed':report['failed'],'lessons':len(report['lesson_results'])},ensure_ascii=False))
if report['failed']:raise SystemExit(1)
