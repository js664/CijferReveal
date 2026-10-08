import {it,expect} from 'vitest';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
const checker=resolve('scripts/check-secrets.mjs');
function temporaryRepository(run:(directory:string)=>void){
 const parent=resolve(tmpdir()),directory=mkdtempSync(join(parent,'cijferreveal-security-'));
 if(dirname(directory)!==parent)throw new Error('Unexpected temporary directory.');
 try{execFileSync('git',['init','--quiet'],{cwd:directory});run(directory);}
 finally{rmSync(directory,{recursive:true,force:true});}
}
it('the staged secret check blocks credentials even after the working copy is cleaned, without logging their value',()=>{
 temporaryRepository(directory=>{
  const credential=['gh','p_', 'x'.repeat(36)].join('');
  writeFileSync(join(directory,'config.txt'),credential);execFileSync('git',['add','config.txt'],{cwd:directory});
  writeFileSync(join(directory,'config.txt'),'clean working copy');
  const result=spawnSync(process.execPath,[checker,'--staged'],{cwd:directory,encoding:'utf8'});
  expect(result.status).toBe(1);expect(result.stderr).toContain('GitHub-token');expect(result.stderr+result.stdout).not.toContain(credential);
 });
});
it('a clean staged repository passes the secret check',()=>{
 temporaryRepository(directory=>{
  writeFileSync(join(directory,'README.md'),'Synthetische, openbare projectdocumentatie.');execFileSync('git',['add','README.md'],{cwd:directory});
  const result=spawnSync(process.execPath,[checker,'--staged'],{cwd:directory,encoding:'utf8'});
  expect(result.status).toBe(0);expect(result.stdout).toContain('Geheimencontrole geslaagd');
 });
});
