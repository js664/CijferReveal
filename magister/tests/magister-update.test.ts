import {it,expect} from 'vitest';
import {magisterRelease,newestMagisterRelease} from '../src/magister/release-update';
const release=(version:string)=>({tag_name:`magister-v${version}`,html_url:`https://github.com/js664/CijferReveal/releases/tag/magister-v${version}`,draft:false,prerelease:false,assets:[{name:'CijferReveal-Magister.zip',browser_download_url:`https://github.com/js664/CijferReveal/releases/download/magister-v${version}/CijferReveal-Magister.zip`}]});
it('selects the newest Magister release and ignores pre-releases',()=>{
 expect(newestMagisterRelease('0.2.8',[release('0.2.7'),release('0.3.0'),release('0.2.9')])).toMatchObject({version:'0.3.0',update:true,prerelease:false});
 expect(magisterRelease('0.2.8',release('0.2.8'))?.update).toBe(false);
});
it('rejects drafts, SomToday tags, missing provider assets and external URLs',()=>{
 for(const r of [{...release('0.2.9'),draft:true},{...release('0.2.9'),tag_name:'v0.2.9'},{...release('0.2.9'),assets:[]},{...release('0.2.9'),html_url:'https://evil.example'},{...release('0.2.9'),assets:[{name:'CijferReveal-Magister.zip',browser_download_url:'https://evil.example'}]}])expect(magisterRelease('0.2.8',r)).toBeNull();
});
