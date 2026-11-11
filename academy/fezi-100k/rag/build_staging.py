#!/usr/bin/env python3
"""Keep drafts private: index only manifest-reviewed content in production search."""
from pathlib import Path
import sqlite3,json,hashlib
root=Path(__file__).resolve().parents[1];db=root/'rag'/'knowledge.sqlite3'
reviews=json.loads((root/'rag'/'reviews.json').read_text()).get('reviews',[])
allowed={x.get('lesson_id'):x for x in reviews if x.get('approved') is True and isinstance(x.get('score'),int) and x['score']>=85 and x.get('reviewer') and x.get('reviewed_at') and x.get('sha256')}
con=sqlite3.connect(db)
con.execute('CREATE VIRTUAL TABLE IF NOT EXISTS reviewed_knowledge USING fts5(lesson_id UNINDEXED,title,content,tokenize="unicode61")')
con.execute('CREATE VIRTUAL TABLE IF NOT EXISTS draft_staging USING fts5(lesson_id UNINDEXED,title,content,tokenize="unicode61")')
con.execute('DELETE FROM draft_staging');con.execute('DELETE FROM reviewed_knowledge')
for md in sorted((root/'lessons').rglob('*.md')):
 content=md.read_text();record=(md.stem,content.splitlines()[0][2:],content)
 con.execute('INSERT INTO draft_staging(lesson_id,title,content) VALUES(?,?,?)',record)
 review=allowed.get(md.stem)
 if review and hashlib.sha256(md.read_bytes()).hexdigest()==review['sha256'] and review.get('tests_passed') is True:
  con.execute('INSERT INTO reviewed_knowledge(lesson_id,title,content) VALUES(?,?,?)',record)
con.commit();summary={'staged':con.execute('select count(*) from draft_staging').fetchone()[0],'reviewed':con.execute('select count(*) from reviewed_knowledge').fetchone()[0],'weights_changed':False}
con.close();print(json.dumps(summary,ensure_ascii=False))
