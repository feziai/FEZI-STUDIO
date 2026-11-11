import crypto from 'node:crypto';
import {fileName} from './validation.js';
// FEZI AGENT v0.5 -- generates portable *source packages*. Native binaries
// are built by Android SDK / Gradle or macOS Xcode using the supplied workflow.
const CAP_VERSION='8.6.0';
function slug(s){return String(s||'my-fezi-app').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'my-fezi-app';}
function appIdValid(s){return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(s)&&s.length<160;}
const goatSvg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="52" fill="#201621"/><g fill="none" stroke="#a2e9ce" stroke-width="12" stroke-linejoin="round"><path d="M70 107Q33 65 55 36Q76 56 93 92M186 107Q223 65 201 36Q180 56 163 92"/><path d="M65 100Q62 175 128 211Q194 175 191 100"/><rect x="64" y="113" width="56" height="33" rx="12"/><rect x="136" y="113" width="56" height="33" rx="12"/><path d="M120 125h16M113 169l15 9 15-9"/></g><path d="M128 205l-12 18h24z" fill="#ff977d"/></svg>';
function pwaFiles(site,name){
 let html=site['index.html'];
 if(!html || !/<html/i.test(html))throw new Error('PWA/mobile export requires a static index.html. Build React/Vite first.');
 const manifest={name,short_name:name.slice(0,20),start_url:'./',scope:'./',display:'standalone',background_color:'#201621',theme_color:'#201621',icons:[{src:'fezi-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};
 if(!/<link[^>]*rel=["']manifest["']/i.test(html)) html=html.replace(/<head([^>]*)>/i,'<head$1>\n<link rel="manifest" href="./manifest.webmanifest">\n<meta name="theme-color" content="#201621">');
 if(!/serviceWorker\.register/.test(html)) html=html.replace(/<\/body>/i,`<script>if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn))}</script>\n</body>`);
 const entries=Object.fromEntries(Object.entries(site).filter(([k,v])=>typeof v==='string' && k!=='manifest.webmanifest' && k!=='service-worker.js'));
 entries['index.html']=html;
 entries['manifest.webmanifest']=JSON.stringify(manifest,null,2);
 entries['fezi-icon.svg']=goatSvg;
 const cacheKey='fezi-'+crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0,16);
 const offlineAssets=['./',...Object.keys(entries).filter(x=>/\.(?:html|css|js|mjs|svg|webmanifest|json)$/i.test(x)).map(x=>'./'+x)];
 entries['service-worker.js']=`const CACHE=${JSON.stringify(cacheKey)};const ASSETS=${JSON.stringify(offlineAssets)};self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fezi-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(!ASSETS.some(p=>new URL(p,self.registration.scope).href===e.request.url))return;e.respondWith(fetch(e.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(e.request,response.clone())}return response}).catch(()=>caches.match(e.request)))})`;

 return entries;
}
const androidWorkflow=`name: Build Android APK\non:\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  android:\n    runs-on: ubuntu-latest\n    timeout-minutes: 45\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - uses: actions/setup-java@v4\n        with:\n          distribution: temurin\n          java-version: '21'\n      - name: Install locked Capacitor packages\n        run: npm ci\n      - name: Generate Android project\n        run: npx cap add android\n      - name: Build APK\n        run: |\n          cd android\n          chmod +x gradlew\n          ./gradlew assembleDebug --no-daemon\n      - uses: actions/upload-artifact@v4\n        with:\n          name: fezi-app-debug-apk\n          path: android/app/build/outputs/apk/debug/*.apk\n          if-no-files-found: error\n`;
export function createBuildExport(site,{kind,projectName,appId='ai.fezi.generated'}={}){
 if(!['pwa','mobile','android','ios'].includes(kind))throw new Error('Supported formats: pwa, mobile, android, ios');
 if(!site||typeof site!=='object')throw new Error('Missing project files');
 for(const [p,v] of Object.entries(site)){try{fileName(p);}catch{throw new Error('Unsafe project path');}if(typeof v!=='string')throw new Error('Unsafe project content');}
 const name=String(projectName||'FEZI App').slice(0,50);
 const pwa=pwaFiles(site,name);
 if(kind==='pwa')return pwa;
 if(!appIdValid(appId))throw new Error('Application ID must resemble ai.fezi.myapp');
 const app={name:slug(name),version:'0.1.0',private:true,description:'Static FEZI AGENT export; build with Android SDK or macOS Xcode',scripts:{'build:android':'npx cap sync android && cd android && ./gradlew assembleDebug','build:ios':'npx cap sync ios'},dependencies:{'@capacitor/core':CAP_VERSION,'@capacitor/android':CAP_VERSION,'@capacitor/ios':CAP_VERSION},devDependencies:{'@capacitor/cli':CAP_VERSION}};
 const files=Object.fromEntries(Object.entries(pwa).map(([p,v])=>['www/'+p,v]));
 files['package.json']=JSON.stringify(app,null,2)+'\n';
 files['capacitor.config.json']=JSON.stringify({appId,appName:name,webDir:'www'},null,2)+'\n';
 files['README-BUILD.md']=[`# ${name} — FEZI mobile source package`,'','This ZIP is **source code**, not an APK or IPA.','Requires Node.js 22+, Java/Android SDK for APK, macOS/Xcode + Apple signing for IPA.','','1. Extract files, then run `npm install` (creates package-lock.json).','2. Android: `npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug`.','3. Output: `android/app/build/outputs/apk/debug/app-debug.apk`.','4. iOS on macOS: `npx cap add ios && npx cap sync ios`; open `ios/App/App.xcworkspace` in Xcode, sign and archive.','5. GitHub Actions: commit generated package-lock.json and sources to a **new repo**, then run Build Android APK workflow manually.','6. APK generated here is a debug build; for production use a protected signing process and signed release artifact.','','This wrapper packages the static frontend. Native plugins and a backend are not autogenerated.',''].join('\n');
 files['.github/workflows/build-android-apk.yml']=androidWorkflow;
 return files;
}
