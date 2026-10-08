import {compareStableVersions} from './version';

export type LatestReleaseData={tag_name?:unknown;html_url?:unknown;draft?:unknown;prerelease?:unknown};
export type ReleaseUpdate={update:boolean;version:string;url:string};

/** Treat the GitHub API response as data only; accept links to this repo's tag release. */
export function releaseUpdate(current:string,release:LatestReleaseData):ReleaseUpdate|null{
 if(typeof release.tag_name!=='string'||typeof release.html_url!=='string'||release.draft===true||release.prerelease===true||compareStableVersions('0.0.0',release.tag_name)===null)return null;
 let url:URL;try{url=new URL(release.html_url);}catch{return null;}
 if(url.protocol!=='https:'||url.hostname!=='github.com'||url.pathname!==`/js664/CijferReveal/releases/tag/${encodeURIComponent(release.tag_name)}`||url.search||url.hash)return null;
 const comparison=compareStableVersions(current,release.tag_name);if(comparison===null)return null;
 return{update:comparison<0,version:release.tag_name.replace(/^v/,''),url:url.href};
}
