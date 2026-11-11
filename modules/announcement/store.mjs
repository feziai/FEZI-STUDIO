import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createCipheriv,createDecipheriv,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export class AnnouncementStore {
 constructor(file,key){if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('ANNOUNCEMENT_MASTER_KEY must be 32 random bytes in hex');this.key=Buffer.from(key,'hex');if(file!==':memory:')mkdirSync(dirname(file),{recursive:true,mode:0o700});this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS bots(id TEXT PRIMARY KEY,username TEXT NOT NULL,secret TEXT NOT NULL,enabled INTEGER DEFAULT 1);
 CREATE TABLE IF NOT EXISTS destinations(bot TEXT,chat TEXT,kind TEXT,consent TEXT,active INTEGER DEFAULT 1,PRIMARY KEY(bot,chat));
 CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,text TEXT,created INTEGER,state TEXT DEFAULT 'draft');
 CREATE TABLE IF NOT EXISTS deliveries(campaign TEXT,chat TEXT,bot TEXT,state TEXT DEFAULT 'queued',due INTEGER DEFAULT 0,error TEXT,PRIMARY KEY(campaign,chat));
 CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at INTEGER,action TEXT,detail TEXT);
 CREATE TABLE IF NOT EXISTS bot_tasks(id TEXT PRIMARY KEY,bot TEXT NOT NULL,prompt TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'queued',result TEXT DEFAULT '',FOREIGN KEY(bot) REFERENCES bots(id));`);
 // A crash after Telegram accepted a message is ambiguous. Never blindly resend it.
 }
 audit(action,detail){this.db.prepare('INSERT INTO audit(at,action,detail) VALUES(?,?,?)').run(Date.now(),action,detail)}
 seal(token){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key,iv);const body=Buffer.concat([c.update(token,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64')}
 token(id){const row=this.db.prepare('SELECT secret FROM bots WHERE id=? AND enabled=1').get(id);if(!row)throw Error('Bot unavailable');const b=Buffer.from(row.secret,'base64'),d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8')}
 addBot(id,username,token){if(!/^\d+$/.test(String(id))||!/^\d+:[\w-]{20,}$/.test(token))throw Error('Invalid bot');this.db.prepare('INSERT INTO bots(id,username,secret) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,secret=excluded.secret,enabled=1').run(String(id),username,this.seal(token));this.audit('bot_registered',String(id));}
 subscribe(bot,chat,kind,consent){if(!this.db.prepare('SELECT id FROM bots WHERE id=? AND enabled=1').get(String(bot)))throw Error('Unknown bot');if(!/^-?\d+$/.test(String(chat))||!['private','group','supergroup','channel'].includes(kind)||!consent)throw Error('Invalid destination');this.db.prepare('INSERT INTO destinations VALUES(?,?,?,?,1) ON CONFLICT(bot,chat) DO UPDATE SET active=1,consent=excluded.consent').run(String(bot),String(chat),kind,String(consent).slice(0,300));}
 unsubscribe(bot,chat){this.db.prepare('UPDATE destinations SET active=0 WHERE bot=? AND chat=?').run(String(bot),String(chat))}
 preview(text){if(typeof text!=='string'||!text.trim()||text.length>4000)throw Error('Message must contain 1–4000 characters');const id=randomUUID();this.db.prepare('INSERT INTO campaigns(id,text,created) VALUES(?,?,?)').run(id,text,Date.now());return {id,text,recipients:this.db.prepare('SELECT count(DISTINCT chat) AS n FROM destinations JOIN bots ON bots.id=destinations.bot WHERE active=1 AND enabled=1').get().n}}
 confirm(id){this.db.exec('BEGIN IMMEDIATE');try{const c=this.db.prepare('SELECT * FROM campaigns WHERE id=?').get(id);if(!c||c.state!=='draft'||Date.now()-c.created>900000)throw Error('Draft expired or already confirmed');this.db.prepare(`INSERT INTO deliveries(campaign,chat,bot) SELECT ?,chat,MIN(bot) FROM destinations JOIN bots ON bots.id=destinations.bot WHERE active=1 AND enabled=1 GROUP BY chat`).run(id);this.db.prepare("UPDATE campaigns SET state='confirmed' WHERE id=?").run(id);this.audit('campaign_confirmed',id);this.db.exec('COMMIT')}catch(e){this.db.exec('ROLLBACK');throw e}return this.status()}
 resolveBot(selector){const value=String(selector||'').replace(/^@/,'').trim();const row=this.db.prepare('SELECT id,username FROM bots WHERE enabled=1 AND (id=? OR lower(username)=lower(?))').get(value,value);if(!row)throw Error('Target bot is not registered and enabled');return row}
 queueTask(bot,prompt){if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1500)throw Error('Task prompt must be 1–1500 characters');const target=this.resolveBot(bot);const id=randomUUID(),created=Date.now();this.db.prepare('INSERT INTO bot_tasks(id,bot,prompt,created,updated,state) VALUES(?,?,?,?,?,?)').run(id,target.id,prompt.trim(),created,created,'queued');this.audit('bot_task_queued',id+' '+target.id);return {id,bot:target.id,username:target.username,state:'queued',note:'Task queued for a future authorized bot agent; no automatic execution is implied'} }
 listBotTasks(limit=25){return this.db.prepare('SELECT id,bot,prompt,created,updated,state,result FROM bot_tasks ORDER BY created DESC LIMIT ?').all(Math.max(1,Math.min(50,limit)))}
 status(){return {bots:this.db.prepare('SELECT id,username,enabled FROM bots').all(),destinations:this.db.prepare('SELECT bot,chat,kind,active FROM destinations').all(),campaigns:this.db.prepare('SELECT id,created,state FROM campaigns ORDER BY created DESC LIMIT 50').all(),deliveries:this.db.prepare('SELECT state,count(*) AS count FROM deliveries GROUP BY state').all(),tasks:this.listBotTasks()}}
 set(k,v){this.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k,String(v))}get(k){return this.db.prepare('SELECT v FROM settings WHERE k=?').get(k)?.v}
 close(){this.db.close()}
}
export async function telegram(token,method,body){try{const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(40000)});const j=await r.json();if(!j.ok){const e=Error('Telegram request rejected');e.code=j.error_code;e.retry=j.parameters?.retry_after;throw e}return j.result}catch(e){if(e.code)throw e;const clean=Error('Telegram response uncertain');clean.uncertain=true;throw clean}}
export async function deliverOne(store,send=telegram){
 store.db.exec('BEGIN IMMEDIATE');let row;
 try{row=store.db.prepare(`SELECT d.*,c.text FROM deliveries d JOIN campaigns c ON c.id=d.campaign WHERE d.state='queued' AND d.due<=? ORDER BY c.created LIMIT 1`).get(Date.now());if(row)store.db.prepare("UPDATE deliveries SET state='sending' WHERE campaign=? AND chat=?").run(row.campaign,row.chat);store.db.exec('COMMIT')}catch(e){store.db.exec('ROLLBACK');throw e}if(!row)return false;
 const active=store.db.prepare('SELECT active FROM destinations WHERE bot=? AND chat=?').get(row.bot,row.chat);
 let state='sent',error=null,due=0;
 if(!active?.active){state='cancelled'}else try{await send(store.token(row.bot),'sendMessage',{chat_id:row.chat,text:row.text})}catch(e){state=e.uncertain?'uncertain':e.code===429?'queued':'failed';error=e.code?String(e.code):'uncertain';due=Date.now()+Math.max(3,Number(e.retry)||60)*1000;if(e.code===403)store.unsubscribe(row.bot,row.chat)}
 store.db.prepare('UPDATE deliveries SET state=?,due=?,error=? WHERE campaign=? AND chat=?').run(state,due,error,row.campaign,row.chat);return true;
}
