import {readFileSync} from 'node:fs';import {AnnouncementStore,telegram} from './store.mjs';
const s=new AnnouncementStore(process.env.ANNOUNCEMENT_DB||'data/announcement.sqlite',process.env.ANNOUNCEMENT_MASTER_KEY);
const file=process.env.ANNOUNCEMENT_IMPORT_FILE;if(!file)throw Error('Set private ANNOUNCEMENT_IMPORT_FILE');
for(const entry of JSON.parse(readFileSync(file,'utf8'))){try{const me=await telegram(entry.token,'getMe',{});s.addBot(String(me.id),me.username,entry.token);console.log('Registered',me.username,me.id)}catch{console.error('Could not validate one bot; token not logged')}}s.close();
