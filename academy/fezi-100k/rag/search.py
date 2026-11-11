#!/usr/bin/env python3
from pathlib import Path
import sqlite3,sys
root=Path(__file__).resolve().parents[1];db=root/'rag'/'knowledge.sqlite3'
if not db.exists():raise SystemExit('Run build_staging.py first')
query=' '.join(sys.argv[1:]).strip()
if not query:raise SystemExit('Usage: python3 search.py keyword (verified lessons only)')
con=sqlite3.connect(db)
for row in con.execute('SELECT lesson_id,title,snippet(reviewed_knowledge,2,"[","]","…",12) FROM reviewed_knowledge WHERE reviewed_knowledge MATCH ? LIMIT 10',(query,)):
 print(*row,sep=' | ')
