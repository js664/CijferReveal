import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';

const root=resolve('.'),staged=process.argv.includes('--staged'),excluded=new Set(['.git','node_modules','dist','dist-dev','pack-opening-voor-somtoday','.impeccable','test-results','playwright-report']);
const binary=/\.(?:mp3|png|jpe?g|webp|gif|ico|zip|woff2?|ttf|pdf|webm|mp4)$/i;
const rules=[
 ['privésleutel',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
 ['GitHub-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
 ['AWS-toegangssleutel',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['JWT',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
 ['ingebouwde credential',/(?:client[_-]?secret|access[_-]?token|refresh[_-]?token|api[_-]?key|password|authorization)["']?\s*[:=]\s*["'][^"'\r\n]{12,}["']/gi],
 ['persoonlijk bestandspad',/(?:[A-Z]:[\\/]{1,2}Users[\\/]{1,2}|\/Users\/)[^\s"'`]+/gi],
];
let files;
try{files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean);}
catch{
 if(staged)throw new Error('Een staged controle vereist een Git-repository.');
 files=[];const walk=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){if(excluded.has(entry.name))continue;const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else files.push(relative(root,path));}};await walk(root);
}
let findings=0,scanned=0;
for(const file of files){
 if(binary.test(file))continue;
 if(/(?:^|[\\/])\.env(?:\.|$)/.test(file)&&!file.endsWith('.example')||/\.(?:pem|key|p12|pfx|har)$/i.test(file)){console.error(`${file}: gevoelig lokaal bestand`);findings++;continue;}
 let body;
 if(staged)body=execFileSync('git',['show',`:${file.replaceAll('\\','/')}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
 else try{body=await readFile(resolve(root,file),'utf8');}catch(error){if(error?.code==='ENOENT')continue;throw error;}
 scanned++;
 for(const [kind,pattern] of rules){pattern.lastIndex=0;for(const match of body.matchAll(pattern)){console.error(`${file}:${body.slice(0,match.index).split('\n').length}: ${kind} (waarde verborgen)`);findings++;}}
}
if(findings){console.error(`${findings} mogelijke geheimen/persoonlijke paden gevonden. Publicatie gestopt.`);process.exitCode=1;}
else console.log(`Geheimencontrole geslaagd: ${scanned} tekstbestanden; geen herkenbare credentials of persoonlijke paden.`);
