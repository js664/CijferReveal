import {compareStableVersions} from '../../../shared/version';
export type MagisterUpdate={update:boolean;version:string;url:string;prerelease:boolean};
export function magisterRelease(current:string,release:unknown):MagisterUpdate|null{
 if(!release||typeof release!=='object')return null;const r=release as {tag_name?:unknown;html_url?:unknown;draft?:unknown;prerelease?:unknown;assets?:unknown};
 if(r.draft===true||r.prerelease!==false||typeof r.tag_name!=='string'||!/^v\d+\.\d+\.\d+$/.test(r.tag_name)||r.html_url!==`https://github.com/js664/CijferReveal/releases/tag/${r.tag_name}`||!Array.isArray(r.assets))return null;
 const tag=r.tag_name;
 if(!r.assets.some(asset=>asset&&typeof asset==='object'&&asset.name==='CijferReveal-Magister.zip'&&asset.browser_download_url===`https://github.com/js664/CijferReveal/releases/download/${tag}/CijferReveal-Magister.zip`))return null;
 const version=tag.slice('v'.length),comparison=compareStableVersions(current,version);if(comparison===null)return null;
 return {update:comparison<0,version,url:r.html_url,prerelease:r.prerelease};
}
export function newestMagisterRelease(current:string,releases:unknown):MagisterUpdate|null{
 if(!Array.isArray(releases))return null;let latest:MagisterUpdate|null=null;
 for(const release of releases){const candidate=magisterRelease(current,release);if(candidate&&(!latest||compareStableVersions(latest.version,candidate.version)===-1))latest=candidate;}
 return latest;
}
