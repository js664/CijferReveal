import {readFile,access,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
const build=process.env.PO_BUILD_DIR??'dist',archive=process.env.PO_BUILD_ZIP??'pack-opening-voor-somtoday.zip';
const m=JSON.parse(await readFile(`${build}/manifest.json`,'utf8'));assert.equal(m.manifest_version,3);assert.deepEqual(m.permissions,['storage']);assert.deepEqual(m.host_permissions,['https://leerling.somtoday.nl/*','https://api.github.com/*']);
assert.equal(m.content_scripts[0].run_at,'document_start');assert.equal(m.content_scripts[1].world,'MAIN');
for(const c of m.content_scripts){assert.deepEqual(c.matches,['https://leerling.somtoday.nl/*']);for(const f of [...c.js,...(c.css??[])])await access(`${build}/${f}`);}
for(const c of m.content_scripts)assert(c.exclude_matches?.includes('https://leerling.somtoday.nl/cijfers/vakgemiddelden*'),'vakgemiddelden must not receive extension scripts or styles');
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
