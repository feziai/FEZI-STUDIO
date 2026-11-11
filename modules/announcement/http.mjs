import {AnnouncementStore,telegram} from './store.mjs';
let store;
export async function announcementHttp(req,res,url,{authenticated,readBody,json}){
 if(!url.startsWith('/api/announcement/'))return false;
 if(!authenticated(req)){json(res,401,{error:'Owner login required'});return true}
 try{
 store ||= new AnnouncementStore(process.env.ANNOUNCEMENT_DB||'data/announcement.sqlite',process.env.ANNOUNCEMENT_MASTER_KEY);
 if(req.method==='GET'&&url.endsWith('/status')){json(res,200,store.status());return true}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed'});return true}
 const b=await readBody(req);
 if(url.endsWith('/bots')){const me=await telegram(String(b.token),'getMe',{});store.addBot(String(me.id),me.username,String(b.token));json(res,201,{id:me.id,username:me.username})}
 else if(url.endsWith('/destinations')){
 if(b.consent!==true)throw Error('Explicit subscription or channel-owner authorization required');
 if(!/^-\d+$/.test(String(b.chat)))throw Error('Only groups and channels can be manually registered. Private users must opt in.');
 const token=store.token(String(b.bot));const chat=await telegram(token,'getChat',{chat_id:String(b.chat)});
 const member=await telegram(token,'getChatMember',{chat_id:chat.id,user_id:Number(b.bot)});
 if(['left','kicked','restricted'].includes(member.status)||(chat.type==='channel'&&!(member.status==='administrator'&&member.can_post_messages)))throw Error('Bot lacks permission');
 store.subscribe(String(b.bot),String(chat.id),chat.type,'Owner registered authorized destination');json(res,201,{ok:true})}
 else if(url.endsWith('/disable')){store.db.prepare('UPDATE bots SET enabled=0 WHERE id=?').run(String(b.bot));json(res,200,{ok:true})}
 else if(url.endsWith('/preview'))json(res,201,store.preview(b.text));
 else if(url.endsWith('/confirm'))json(res,200,store.confirm(b.id));
 else if(url.endsWith('/task')){json(res,202,store.queueTask(b.bot,b.prompt))}
 else if(url.endsWith('/unsubscribe')){store.unsubscribe(b.bot,b.chat);json(res,200,{ok:true})}
 else json(res,404,{error:'Unknown operation'});
 }catch{json(res,400,{error:'Operation failed. Check configuration, authorization and Telegram permissions; secrets are not returned.'})}return true;
}
