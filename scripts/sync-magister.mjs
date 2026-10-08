import {cp,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
const source=resolve(process.argv[2]??'../Magister Extension'),target=resolve('magister');
await access(resolve(source,'src/magister/bootstrap.tsx'));await mkdir(target,{recursive:true});
for(const path of ['src','tests','assets','package.json','package-lock.json','manifest.json','tsconfig.json','vite.config.ts','eslint.config.js','playwright.magister.config.ts','popup.html','tester.html','LICENSE','THIRD_PARTY_NOTICES.txt','README.md','PRIVACY.md','CHANGELOG.md','AGENTS.md'])await cp(resolve(source,path),resolve(target,path),{recursive:true,filter:file=>!file.includes('inventory-music')&&!file.endsWith('.wav')&&!/(?:opening-start|reel-tick|reveal-impact)\.mp3$/.test(file)});
await mkdir(resolve(target,'scripts'),{recursive:true});
for(const file of ['build.mjs','validate.mjs','check-secrets.mjs'])await cp(resolve(source,'scripts',file),resolve(target,'scripts',file));
// Legacy website tests belong to the root website, not the standalone provider.
const {rm}=await import('node:fs/promises');await rm(resolve(target,'tests/website.test.ts'),{force:true});
console.log('Magister source snapshot synchronized; dependencies, credentials and build outputs excluded.');
