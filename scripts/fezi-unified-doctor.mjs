#!/usr/bin/env node
/** No external calls and no secret output; run from installed project root. */
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {feziUnifiedReadiness} from '../core/fezi-unified-knowledge.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sources=JSON.parse(readFileSync(path.join(root,'references/fezi-scholar-telegram/SOURCE_MANIFEST.json'),'utf8'));
const required=['server.js','core/fezi-agent-mcp.mjs','core/fezi-site-editor.mjs','core/fezi-unified-knowledge.mjs','public/fezi-agent/knowledge.html','references/fezi-scholar-telegram/telegram-knowledge-fa.md','references/fezi-scholar-telegram/scholar-research-SKILL.md','references/fezi-scholar-telegram/video5-SKILL.md'];
const missing=required.filter(x=>!existsSync(path.join(root,x)));
const report={packageReady:missing.length===0,nodeMajor:Number(process.versions.node.split('.')[0]),sourceDocuments:sources.documentIndex.length,missing,readiness:feziUnifiedReadiness(process.env),note:'This does not verify external webhooks, model inference, ChatGPT plugin connection, or real deployment.'};
console.log(JSON.stringify(report,null,2));
if(missing.length||report.nodeMajor<22)process.exitCode=1;
