import {readFile,access,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
const build=process.env.PO_BUILD_DIR??'dist',archive=process.env.PO_BUILD_ZIP??'pack-opening-voor-magister.zip';
const m=JSON.parse(await readFile(`${build}/manifest.json`,'utf8'));assert.equal(m.manifest_version,3);assert.deepEqual(m.permissions,['storage','webRequest']);assert.deepEqual(m.host_permissions,['https://*.magister.net/*','https://api.github.com/*']);
assert.equal(m.version,JSON.parse(await readFile('manifest.json','utf8')).version);
if(m.browser_specific_settings){
 assert.deepEqual(m.background,{scripts:['worker.js']});
 assert.equal(m.browser_specific_settings.gecko.id,'cijferreveal-magister@js664.github.io');
 assert.deepEqual(m.browser_specific_settings.gecko.data_collection_permissions,{required:['none']});
 assert.equal(m.browser_specific_settings.gecko.strict_min_version,'140.0');
 assert.equal(m.browser_specific_settings.gecko_android.strict_min_version,'142.0');
}else assert.equal(m.background.service_worker,'worker.js');
for(const size of [16,32,48,128]){assert.equal(m.icons[size],`assets/icons/icon-${size}.png`);await access(`${build}/${m.icons[size]}`);}
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.txt'])assert.equal(await readFile(`${build}/${name}`,'utf8'),await readFile(name,'utf8'));
assert.equal(m.content_scripts[0].run_at,'document_start');assert.equal(m.content_scripts.length,2);assert.equal(m.content_scripts[0].world,'ISOLATED');
for(const c of m.content_scripts){assert.deepEqual(c.matches,['https://*.magister.net/*']);for(const f of [...c.js,...(c.css??[])])await access(`${build}/${f}`);}
assert(m.content_scripts[1].js.includes('debug-console.js'),'Only the debug console toggle runs in MAIN');
for(const f of ['worker.js','popup.html','assets/case-opening.mp3','assets/high-grade-accent.mp3'])await access(`${build}/${f}`);
const content=await readFile(`${build}/content.js`,'utf8');assert(!content.includes('po/diagnostics'));
assert(!(await readdir(build)).includes('tester.html'));
const zip=unzipSync(new Uint8Array(await readFile(archive)));
assert.deepEqual(JSON.parse(new TextDecoder().decode(zip['manifest.json'])),m);
for(const [name,bytes] of Object.entries(zip)){
 assert(!/^(?:dist\/|tester\.html)|\.map$|(?:test-results|node_modules|\.env)/.test(name));
 assert.deepEqual(Buffer.from(bytes),await readFile(`${build}/${name}`));
}
console.log('Manifest, permissions, packaged files and production diagnostic exclusion: PASS');
