import {describe,it,expect} from 'vitest';
import {magisterOrigin,personRequest,parseRecent} from '../src/magister/provider';
import {authorizeCommand} from '../src/state/commands';
const grade=(extra:Record<string,unknown>={})=>({kolomId:42,waarde:'7,4',vak:{code:'wi',omschrijving:'Wiskunde'},omschrijving:'Hoofdstuk 3',ingevoerdOp:'2026-10-06T09:00:00Z',weegfactor:2,...extra});
describe('Magister provider',()=>{
 it('accepts only HTTPS school tenants and exact person API paths',()=>{
  expect(magisterOrigin('https://school.magister.net/#/cijfers')).toBe('https://school.magister.net');
  for(const url of ['http://school.magister.net','https://school.magister.net.evil.test','https://magister.net','https://user@school.magister.net','https://school.magister.net:8443'])expect(magisterOrigin(url)).toBeNull();
  expect(personRequest('https://school.magister.net/api/personen/17/cijfers/laatste')).toEqual({origin:'https://school.magister.net',userId:'17'});
  expect(personRequest('https://school.magister.net/api/personen/../account')).toBeNull();
 });
 it('preserves API column identity, decimals and textual grades without inventing subject IDs',()=>{
  const [numeric,label]=parseRecent({items:[grade(),grade({kolomId:43,waarde:'U',weegfactor:null})]});
  expect(numeric).toMatchObject({id:'recent:42',columnId:'42',value:'7,4',weight:'2',subjectId:'',isCijfer:true,aggregate:false});
  expect(label).toMatchObject({value:'U',isCijfer:false,isLabel:true,weight:''});
 });
 it('drops ambiguous identities, invalid dates, empty values and unsafe IDs',()=>{
  expect(parseRecent({items:[grade(),grade(),grade({kolomId:44,ingevoerdOp:'bad'}),grade({kolomId:-1}),grade({kolomId:45,waarde:''})]})).toEqual([]);
  expect(()=>parseRecent({Items:[]})).toThrow();expect(()=>parseRecent({items:Array(2001).fill(grade())})).toThrow();
 });
 it('never authorizes SomToday pages or subframes in this extension',()=>{
  const message={protocol:'po/storage',command:{kind:'read'}},sender={id:'extension',frameId:0,tab:{id:1} as chrome.tabs.Tab};
  expect(authorizeCommand(message,{...sender,url:'https://school.magister.net/#/cijfers'},'extension')).toEqual({kind:'read'});
  expect(authorizeCommand(message,{...sender,url:'https://leerling.somtoday.nl/cijfers'},'extension')).toBeNull();
  expect(authorizeCommand(message,{...sender,url:'https://school.magister.net/#/cijfers',frameId:1},'extension')).toBeNull();
 });
});
