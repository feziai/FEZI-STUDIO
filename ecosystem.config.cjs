/** Optional PM2 process definitions. Only use on a host supporting persistent workers.
 * Populate all environment variables securely on the host; never put tokens here.
 * One process per bot token: two polling workers may not poll the same bot.
 */
module.exports={apps:[
 {name:'fezi-web-v101',script:'server.js',instances:1,autorestart:true,max_memory_restart:'400M'},
 {name:'fezi-studio-bot',script:'scripts/telegram-public.mjs',instances:1,autorestart:true,env:{TELEGRAM_MODE:'public-polling'}},
 {name:'fezi-arina-bot',script:'scripts/telegram-arina-miniapp.mjs',instances:1,autorestart:true},
 {name:'fezi-login-bot',script:'scripts/telegram-login-bot.mjs',instances:1,autorestart:true}
]};
