import {it,expect} from 'vitest';
import {safeData,errorData,formatDebug,validDebugEntry} from '../src/magister/debug';
it('debug logs discard credentials, raw response bodies, grade values and unsafe metadata',()=>{
 const result=safeData({authorization:'secret',cookie:'secret',value:'8,3',subject:'Wiskunde',userId:17,body:{items:[]},url:'https://school.magister.net',status:401,count:0,reason:'Bearer secret',stage:'fetch'});
 expect(result).toEqual({status:401,count:0,stage:'fetch'});
 expect(errorData(new Error('Failed to fetch https://school.magister.net/api/personen/17 with Bearer secret'))).toEqual({errorName:'Error',issue:'network'});
 const entry=validDebugEntry({time:new Date().toISOString(),source:'worker',level:'error',event:'api.recent-failed',data:result,token:'secret'});
 expect(entry).toBeTruthy();const text=formatDebug([entry!],'0.1.1');expect(text).toContain('401');expect(text).not.toContain('secret');expect(text).not.toContain('8,3');expect(text).not.toContain('Wiskunde');
 expect(validDebugEntry({event:'bad\nINJECTED'})).toBeNull();
});
