import {it,expect,vi,afterEach} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('coalesces update checks, caches for an hour and sends no school credentials',async()=>{
 const release={tag_name:'v0.2.9',html_url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.9',draft:false,prerelease:false,assets:[{name:'CijferReveal-Magister.zip',browser_download_url:'https://github.com/js664/CijferReveal/releases/download/v0.2.9/CijferReveal-Magister.zip'}]};
 const fetch=vi.fn(async()=>new Response(JSON.stringify(release),{status:200})),set=vi.fn(async()=>{});
 vi.stubGlobal('fetch',fetch);vi.stubGlobal('chrome',{runtime:{getManifest:()=>({version:'0.2.8'}),onMessage:{addListener:vi.fn()}},storage:{local:{get:vi.fn(async()=>({})),set}}});
 const {latestMagisterUpdate}=await import('../src/magister/update-worker');
 const [first,second]=await Promise.all([latestMagisterUpdate(),latestMagisterUpdate()]);expect(first).toEqual(second);expect(first).toMatchObject({update:true,version:'0.2.9'});
 await latestMagisterUpdate();expect(fetch).toHaveBeenCalledTimes(1);expect(set).toHaveBeenCalledTimes(1);
 expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/js664/CijferReveal/releases/latest',expect.objectContaining({credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'application/vnd.github+json'}}));
});
