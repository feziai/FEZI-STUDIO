import {installSmallModel,smallModelIds} from '../core/small-model-installer.mjs';
const ids=process.argv.slice(2).filter(x=>!x.startsWith('--'));
if(ids.includes('help')||process.argv.includes('--help')){console.log('node scripts/install-small-models.mjs [smollm2-135m] [smollm2-360m]\nOnly on your own server; model weights are not hosted by ChatGPT.');process.exit()}
for(const id of ids.length?ids:smallModelIds()){
 try{console.log('Installing',id);console.log(await installSmallModel(id));}
 catch(e){console.error(id,e.message);process.exitCode=1}
}
