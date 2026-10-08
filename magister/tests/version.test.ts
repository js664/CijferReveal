import {it,expect} from 'vitest';
import {compareStableVersions} from '../src/shared/version';
import {releaseUpdate} from '../src/shared/release-update';

it('detects a newer stable release and ignores equal or older versions',()=>{
 expect(compareStableVersions('0.2.3','v0.2.4')).toBe(-1);
 expect(compareStableVersions('0.2.4','0.2.4')).toBe(0);
 expect(compareStableVersions('0.2.5','0.2.4')).toBe(1);
});

it('uses the stable API release tag and validated API-provided release URL',()=>{
 expect(releaseUpdate('0.2.3',{tag_name:'v0.2.4',html_url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.4'})).toEqual({update:true,version:'0.2.4',url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.4'});
 expect(releaseUpdate('0.2.4',{tag_name:'v0.2.4',html_url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.4'})?.update).toBe(false);
 expect(releaseUpdate('0.2.3',{tag_name:'v0.2.4',html_url:'https://example.com/evil'})).toBeNull();
 expect(releaseUpdate('0.2.3',{tag_name:'v0.2.4',html_url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.4',prerelease:true})).toBeNull();
});

it('rejects malformed, prerelease, and unsafe version strings',()=>{
 for(const value of ['latest','v0.2.4-beta.1','0.2','0.2.4/anything',''])expect(compareStableVersions('0.2.3',value)).toBeNull();
});
