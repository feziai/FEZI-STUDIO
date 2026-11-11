import {listLocalModels} from "../core/local-models.js";
console.table((await listLocalModels()).map(({id,name,sizeMB,installed})=>({id,name,sizeMB,installed})));
