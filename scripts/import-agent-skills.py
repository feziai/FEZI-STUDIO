#!/usr/bin/env python3
"""Safely import SKILL.md documents from an owned plugin's exported ZIP / tar(.gz).
Docs are references only; this script does not run plugin code or authorize remote tools.
"""
import argparse, pathlib, zipfile, tarfile, re, sys, hashlib, tempfile
BASE=pathlib.Path(__file__).resolve().parent.parent/'agent-skills'/'library'
MAX_FILE=70_000
MAX_DOCS=1400

def entries(archive):
  if zipfile.is_zipfile(archive):
    with zipfile.ZipFile(archive) as z:
      for i in z.infolist():
        if i.is_dir() or i.file_size>MAX_FILE or i.compress_size==0 or i.file_size/max(i.compress_size,1)>150:continue
        if i.filename.endswith('/SKILL.md'):
          yield i.filename,z.read(i)
  elif tarfile.is_tarfile(archive):
    with tarfile.open(archive,'r:*') as z:
      for info in z:
        if not info.isfile() or info.size>MAX_FILE or not info.name.endswith('/SKILL.md'):continue
        stream=z.extractfile(info)
        if stream:yield info.name,stream.read(MAX_FILE+1)
  else:raise ValueError('Expected ZIP, .tar or .tar.gz')

def main():
  a=argparse.ArgumentParser()
  a.add_argument('--plugin',required=True,help='Name of the owned plugin being imported')
  a.add_argument('--archive',required=True,help='Downloaded plugin source archive')
  args=a.parse_args()
  source=re.sub('[^a-z0-9-]','-',args.plugin.lower())[:55].strip('-')
  if not source:raise SystemExit('Invalid plugin name')
  count=0
  for name,raw in entries(args.archive):
    parts=pathlib.PurePosixPath(name).parts
    if 'skills' not in parts or len(parts)<3 or len(raw)>MAX_FILE:continue
    skill=parts[-2]
    if not re.fullmatch(r'[a-z0-9-]{2,100}',skill):continue
    try:raw.decode('utf8')
    except UnicodeDecodeError:continue
    dest=BASE/source/skill/'SKILL.md'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(raw)
    count+=1
    if count>=MAX_DOCS:break
  print('Imported',count,'skill reference docs from',source)
  print('No external connector permissions were granted.')
if __name__=='__main__':main()
