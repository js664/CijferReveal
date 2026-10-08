import {readFile,writeFile,copyFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {unzipSync} from 'fflate';

const [tag,outputDirectory]=process.argv.slice(2);
if(!tag||!outputDirectory||!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag))throw new Error('Gebruik een stabiele release-tag zoals v1.2.3 en geef een uitvoermap op.');
const version=tag.slice(1),manifest=JSON.parse(await readFile('manifest.json','utf8'));
if(manifest.version!==version)throw new Error(`Manifestversie ${manifest.version} komt niet overeen met releasetag ${tag}.`);
if(process.env.GITHUB_SHA){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const tagged=execFileSync('git',['rev-parse',`${process.env.GITHUB_REF}^{commit}`],{encoding:'utf8'}).trim();
 if(head!==process.env.GITHUB_SHA||tagged!==process.env.GITHUB_SHA)throw new Error('De build komt niet van de exacte commit van de releasetag.');
}
const dist=resolve('dist'),distManifest=JSON.parse(await readFile(join(dist,'manifest.json'),'utf8'));
if(distManifest.version!==version)throw new Error(`De gebouwde extensie heeft versie ${distManifest.version}, verwacht ${version}.`);
const zipPath=resolve('pack-opening-voor-somtoday.zip'),zipBytes=await readFile(zipPath),entries=unzipSync(new Uint8Array(zipBytes));
const expected=[];
async function collect(folder,prefix=''){
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const name=prefix+entry.name,path=join(folder,entry.name);
  if(entry.isDirectory())await collect(path,`${name}/`);else expected.push(name);
 }
}
await collect(dist);
if(JSON.stringify(Object.keys(entries).sort())!==JSON.stringify(expected.sort()))throw new Error('De productie-ZIP bevat niet exact de bestanden uit dist.');
for(const name of expected){
 const built=await readFile(join(dist,name));
 if(!Buffer.from(entries[name]).equals(built))throw new Error(`Bestand in ZIP wijkt af van dist: ${name}`);
}
const packagedManifest=JSON.parse(new TextDecoder().decode(entries['manifest.json']));
if(packagedManifest.version!==version)throw new Error(`De ZIP bevat manifestversie ${packagedManifest.version}, verwacht ${version}.`);
const magisterBytes=await readFile('magister/pack-opening-voor-magister.zip'),magisterEntries=unzipSync(new Uint8Array(magisterBytes));
const magisterManifest=JSON.parse(new TextDecoder().decode(magisterEntries['manifest.json']));
if(magisterManifest.version!==version||!magisterManifest.name.includes('Magister'))throw new Error('Magister release manifest mismatch.');
const magisterBuilt=JSON.parse(await readFile('magister/dist/manifest.json','utf8'));
if(JSON.stringify(magisterManifest)!==JSON.stringify(magisterBuilt))throw new Error('Magister archive does not match the built manifest.');
for(const [name,bytes] of Object.entries(magisterEntries))if(!Buffer.from(bytes).equals(await readFile(join('magister/dist',name))))throw new Error('Magister archive mismatch: '+name);
const canonicalMigration=resolve('shared/state/migrations.ts');
for(const entry of ['src/state/migrations.ts','magister/src/state/migrations.ts']){
 const source=await readFile(entry,'utf8'),match=source.match(/export \{migrate\} from ['"]([^'"]+)['"]/);
 if(!match||resolve(dirname(entry),match[1]+'.ts')!==canonicalMigration)throw new Error('Provider does not include the canonical migration safeguards: '+entry);
}
await readFile(canonicalMigration,'utf8');
const changelog=await readFile('CHANGELOG.md','utf8'),lines=changelog.split(/\r?\n/),section=lines.findIndex(line=>new RegExp(`^## Versie ${version.replaceAll('.','\\.')}\\b`).test(line));
if(section<0)throw new Error(`Geen Nederlandstalige CHANGELOG-sectie gevonden voor ${version}.`);
const notes=[];
for(let i=section+1;i<lines.length&&!/^##\s/.test(lines[i]);i++)notes.push(lines[i]);
const noteText=notes.join('\n').trim();if(!noteText)throw new Error(`De CHANGELOG-sectie voor ${version} is leeg.`);
await mkdir(outputDirectory,{recursive:true});
const finalZip=join(resolve(outputDirectory),'CijferReveal.zip');
await copyFile(zipPath,finalZip);await copyFile('magister/pack-opening-voor-magister.zip',join(resolve(outputDirectory),'CijferReveal-Magister.zip'));
const finalEntries=unzipSync(new Uint8Array(await readFile(finalZip)));
if(JSON.parse(new TextDecoder().decode(finalEntries['manifest.json'])).version!==version)throw new Error('De uiteindelijke CijferReveal.zip heeft de verkeerde manifestversie.');
await writeFile(join(resolve(outputDirectory),'release-notes.md'),`${noteText}\n`,'utf8');

console.log(`Releasepakket gecontroleerd: ${tag}, alleen productiebuild.`);
