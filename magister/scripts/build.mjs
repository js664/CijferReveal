import {build} from 'vite';
import {readFile,writeFile,mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {zipSync} from 'fflate';
const developer=process.argv.includes('--developer'),snapshot=process.argv.includes('--snapshot'),firefox=process.argv.includes('--firefox'),store=process.argv.includes('--store'),dev=developer||process.argv.includes('--dev'),version=JSON.parse(await readFile('package.json','utf8')).version;
if(store&&(developer||snapshot||dev))throw new Error('Store builds must be production builds.');
if(firefox&&(developer||snapshot||dev))throw new Error('Firefox builds cannot be combined with developer, snapshot or dev builds.');
const buildId=new Date().toISOString().replace(/[-:.TZ]/g,'');const out=resolve(store?`store-builds/${version}/${buildId}/${firefox?'firefox':'chrome'}`:developer?`dist-developer-${version}-${buildId}`:dev?'dist-dev':snapshot?`dist-snapshot-${version}-${buildId}`:firefox?'dist-firefox':'dist');
const outputRelative=relative(resolve('.'),out);if(!outputRelative||outputRelative.startsWith('..')||isAbsolute(outputRelative))throw new Error('Build output must stay inside the workspace.');
if(developer||snapshot||store){try{await mkdir(out,{recursive:store}); }catch(error){if(error?.code==='EEXIST')throw new Error(`Build bestaat al; bestaande bestanden zijn behouden: ${out}`);throw error;}}
else {await mkdir(out,{recursive:true});await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});}
const define={'import.meta.env.DEV':JSON.stringify(dev),'import.meta.env.PROD':JSON.stringify(!dev),'process.env.NODE_ENV':JSON.stringify('production')};
for(const [name,entry] of [['debug-console','src/magister/debug-console.ts'],['content','src/magister/bootstrap.tsx'],['worker','src/state/worker.ts']])await build({configFile:false,define,publicDir:false,build:{outDir:out,emptyOutDir:false,sourcemap:false,minify:true,lib:{entry:resolve(entry),name:`PO_${name.replaceAll('-','_')}`,formats:['iife'],fileName:()=>`${name}.js`},rollupOptions:{onwarn(warning,warn){if(warning.code!=='MODULE_LEVEL_DIRECTIVE')warn(warning);},output:{inlineDynamicImports:true}}}});
await build({configFile:false,define,publicDir:false,base:'./',build:{outDir:out,emptyOutDir:false,sourcemap:false,rollupOptions:{onwarn(warning,warn){if(warning.code!=='MODULE_LEVEL_DIRECTIVE')warn(warning);},input:dev?['popup.html','tester.html']:['popup.html']}}});
const manifest=JSON.parse(await readFile('manifest.json','utf8'));
if(firefox){
 // Firefox desktop and Android use MV3 background scripts/event pages.
 manifest.background={scripts:['worker.js']};
 delete manifest.minimum_chrome_version;
 manifest.browser_specific_settings={
  gecko:{id:'cijferreveal-magister@js664.github.io',strict_min_version:'140.0',data_collection_permissions:{required:['none']}},
  gecko_android:{strict_min_version:'142.0'}
 };
}
if(developer)manifest.name+=` · Developer ${version}`;else if(dev)manifest.name+=' · ontwikkeling';
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));await copyFile('src/spoiler/shield.css',`${out}/shield.css`);await mkdir(`${out}/assets`,{recursive:true});
for(const name of ['case-opening.mp3','high-grade-accent.mp3'])await copyFile(`assets/${name}`,`${out}/assets/${name}`);
await mkdir(`${out}/assets/icons`,{recursive:true});
for(const size of [16,32,48,128])await copyFile(`assets/icons/icon-${size}.png`,`${out}/assets/icons/icon-${size}.png`);
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.txt'])await copyFile(name,`${out}/${name}`);
if(!dev){
 const files={};
 const collect=async(directory,prefix='')=>{for(const entry of await readdir(directory,{withFileTypes:true})){const name=prefix+entry.name,path=resolve(directory,entry.name);if(entry.isDirectory())await collect(path,`${name}/`);else files[name]=new Uint8Array(await readFile(path));}};
 await collect(out);const archive=zipSync(files,{level:6});
 if(store)await writeFile(resolve(out,'..',firefox?'CijferReveal-Magister-Firefox.zip':'CijferReveal-Magister.zip'),archive,{flag:'wx'});else if(snapshot)await writeFile(`CijferReveal-Magister-${version}-local-${buildId}.zip`,archive,{flag:'wx'});else if(firefox)await writeFile('CijferReveal-Magister-Firefox.zip',archive);else await writeFile('pack-opening-voor-magister.zip',archive);
}
if(developer){
 const files={};const collect=async(directory,prefix='')=>{for(const entry of await readdir(directory,{withFileTypes:true})){const name=prefix+entry.name,path=resolve(directory,entry.name);if(entry.isDirectory())await collect(path,`${name}/`);else files[name]=new Uint8Array(await readFile(path));}};await collect(out);await writeFile(`${out}/pack-opening-voor-magister-developer-${version}.zip`,zipSync(files,{level:6}));
}
console.log(`Built ${out} (${(await readdir(out)).length} top-level entries)`);
