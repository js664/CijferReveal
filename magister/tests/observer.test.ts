import {it,expect,vi,afterEach} from 'vitest';
import {rawRecord} from './fixtures';
const originalFetch=window.fetch,originalOpen=XMLHttpRequest.prototype.open,originalSend=XMLHttpRequest.prototype.send;
afterEach(()=>{window.fetch=originalFetch;XMLHttpRequest.prototype.open=originalOpen;XMLHttpRequest.prototype.send=originalSend;vi.restoreAllMocks();vi.resetModules();});
it('fetch preserves original promise/arguments and response body, observing only GET clones',async()=>{
 const response=new Response(JSON.stringify({items:[rawRecord()]}),{status:206,headers:{'content-type':'application/json'}});const original=Promise.resolve(response);const fetcher=vi.fn(()=>original);window.fetch=fetcher;
 const post=vi.spyOn(window,'postMessage');await import('../src/page/network-observer');window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/init',salt:'0'.repeat(64)}}));
 const init={method:'GET',headers:{'X-Fixture':'unchanged'}};const result=window.fetch(`${location.origin}/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture`,init);
 expect(result).toBe(original);expect(fetcher.mock.calls[0]).toEqual([`${location.origin}/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture`,init]);await new Promise(r=>setTimeout(r,30));expect(await response.json()).toHaveProperty('items');expect(post.mock.calls.some(c=>(c[0] as {protocol?:string}).protocol==='po/1')).toBe(true);
});
it.each([['POST','/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture'],['GET','/rest/v1/leerlingen/fixture'],['GET','https://other.invalid/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture']])('ignores %s %s',async(method,url)=>{
 const response=new Response(JSON.stringify({items:[rawRecord()]}));const clone=vi.spyOn(response,'clone');window.fetch=vi.fn(async()=>response);await import('../src/page/network-observer');await window.fetch(url,{method});await new Promise(r=>setTimeout(r,5));expect(clone).not.toHaveBeenCalled();
});
it('preserves original fetch rejection',async()=>{const error=new Error('page failure');window.fetch=vi.fn(()=>Promise.reject(error));await import('../src/page/network-observer');await expect(window.fetch('/fixture')).rejects.toBe(error);});
it('XHR preserves open/send arguments, responseType and existing callbacks',async()=>{
 const open=vi.fn(),send=vi.fn();XMLHttpRequest.prototype.open=open;XMLHttpRequest.prototype.send=send;await import('../src/page/network-observer');const xhr=new XMLHttpRequest(),callback=vi.fn();xhr.onload=callback;xhr.responseType='json';xhr.open('GET',`${location.origin}/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture`,true);xhr.send();expect(open.mock.calls[0]).toEqual(['GET',`${location.origin}/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture`,true]);expect(send).toHaveBeenCalledOnce();expect(xhr.responseType).toBe('json');expect(xhr.onload).toBe(callback);xhr.dispatchEvent(new Event('load'));expect(callback).toHaveBeenCalledOnce();
});
it('an empty recent response still announces the student scope',async()=>{
 window.fetch=vi.fn(async()=>new Response(JSON.stringify({items:[]})));
 const post=vi.spyOn(window,'postMessage');await import('../src/page/network-observer');window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/init',salt:'0'.repeat(64)}}));
 await window.fetch(`${location.origin}/rest/v1/geldendvoortgangsdossierresultaten/leerling/another-student`);
 await vi.waitFor(()=>expect(post.mock.calls.some(call=>{const data=call[0] as {protocol?:string;scope?:string;records?:unknown[]};return data.protocol==='po/1'&&/^[a-f0-9]{64}$/.test(data.scope??'')&&data.records?.length===0;})).toBe(true));
});
it('route suspension detaches network hooks until the bridge resumes',async()=>{
 const response=new Response(JSON.stringify({items:[rawRecord()]})),fetcher=vi.fn(async()=>response);window.fetch=fetcher;
 const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send,post=vi.spyOn(window,'postMessage'),clone=vi.spyOn(response,'clone');
 await import('../src/page/network-observer');expect(window.fetch).not.toBe(fetcher);
 window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/init',salt:'0'.repeat(64)}}));
 window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/disable'}}));
 expect(window.fetch).toBe(fetcher);expect(XMLHttpRequest.prototype.open).toBe(open);expect(XMLHttpRequest.prototype.send).toBe(send);
 await window.fetch(`${location.origin}/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture`);await new Promise(r=>setTimeout(r,5));expect(clone).not.toHaveBeenCalled();
 window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/init',salt:'0'.repeat(64)}}));
 expect(window.fetch).not.toBe(fetcher);expect(post.mock.calls.some(call=>(call[0] as {protocol?:string}).protocol==='po/1')).toBe(false);
});
