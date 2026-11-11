"""Offline Telegram Bot API event handling fixture. No token, no network sends."""

def reply_plan(update: dict, site_url='https://example.invalid') -> dict | None:
    if not isinstance(update, dict) or not isinstance(update.get('update_id'), int):
        return None
    msg = update.get('message')
    if not isinstance(msg, dict) or not isinstance(msg.get('chat'), dict):
        return None
    chat = msg['chat'].get('id')
    if not isinstance(chat, int):
        return None
    text = msg.get('text')
    if not isinstance(text, str) or not text.strip() or len(text)>4096:
        return None
    text=text.strip(); persian=any('\u0600' <= c <= '\u06ff' for c in text)
    if text=='/start':answer='Welcome to FEZI Studio. Type /help to see commands.'
    elif text=='/help':answer='Commands: /image /video /app /help'
    elif text=='/image':answer=f'Create an image at {site_url}/studio?category=image'
    elif text=='/video':answer=f'Create a video at {site_url}/studio?category=video'
    elif text=='/app':answer=f'Build an app at {site_url}/builder'
    elif persian:answer='پیام شما دریافت شد. برای ساخت پروژه وارد وب‌سایت شوید.'
    else:answer='Message received. Visit the studio to create projects.'
    return {'method':'sendMessage','chat_id':chat,'text':answer}


def next_offset(updates: list[dict],current: int=0) -> int:
    ids=[u.get('update_id') for u in updates if isinstance(u,dict) and isinstance(u.get('update_id'),int)]
    return max([current]+[x+1 for x in ids])
