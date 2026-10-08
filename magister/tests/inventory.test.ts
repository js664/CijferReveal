import {describe,it,expect} from 'vitest';
import {filterInventory,inventoryStats,inventorySubjects,tierLabel} from '../src/collection/model';
import type {CollectionEntry} from '../src/state/schema';

const entries:CollectionEntry[]=[
 {key:'a',version:'1',scope:'x',subject:'Wiskunde A',description:'Hoofdstuk 3',date:'2026-09-28',weight:'2',value:'8,3',grade:8.3,openedAt:300},
 {key:'b',version:'2',scope:'x',subject:'Engels',description:'Essay',date:'2026-09-20',weight:'1',value:'5,8',grade:5.8,openedAt:100},
 {key:'c',version:'3',scope:'x',subject:'Bedrijfseconomie',description:'Toets geldzaken',date:'2026-09-29',weight:'1',value:'*',grade:null,openedAt:200},
];

describe('grade inventory',()=>{
 it('sorts by date or grade and keeps nonnumeric opened stars after numeric grades',()=>{
  expect(filterInventory(entries,{query:'',subject:'',tier:'',sort:'newest'}).map(e=>e.key)).toEqual(['a','c','b']);
  expect(filterInventory(entries,{query:'',subject:'',tier:'',sort:'oldest'}).map(e=>e.key)).toEqual(['b','c','a']);
  expect(filterInventory(entries,{query:'',subject:'',tier:'',sort:'highest'}).map(e=>e.key)).toEqual(['a','b','c']);
  expect(filterInventory(entries,{query:'',subject:'',tier:'',sort:'lowest'}).map(e=>e.key)).toEqual(['b','a','c']);
 });
 it('filters within opened entries and searches Dutch metadata case-insensitively',()=>{
  expect(filterInventory(entries,{query:'TOETS GELDZAKEN',subject:'',tier:'',sort:'newest'}).map(e=>e.key)).toEqual(['c']);
  expect(filterInventory(entries,{query:'',subject:'Engels',tier:'',sort:'newest'}).map(e=>e.key)).toEqual(['b']);
  expect(filterInventory(entries,{query:'',subject:'',tier:'bronze',sort:'newest'}).map(e=>e.key)).toEqual(['b']);
 });
 it('filters a star as a nonnumeric result by group, subject, and its visible value',()=>{
  expect(filterInventory(entries,{query:'',subject:'',tier:'neutral',sort:'newest'}).map(e=>e.key)).toEqual(['c']);
  expect(filterInventory(entries,{query:'',subject:'Bedrijfseconomie',tier:'',sort:'newest'}).map(e=>e.key)).toEqual(['c']);
  expect(filterInventory(entries,{query:'*',subject:'',tier:'',sort:'newest'}).map(e=>e.key)).toEqual(['c']);
 });
 it('matches searches regardless of accents or case',()=>{
  const accented=[{...entries[0],subject:'Frans',description:'Écouter et parler'}];
  expect(filterInventory(accented,{query:'ecouter',subject:'',tier:'',sort:'newest'}).map(e=>e.key)).toEqual(['a']);
 });
 it('summarizes opened numeric grades without treating a star as zero',()=>{const stats=inventoryStats(entries);expect(stats.total).toBe(3);expect(stats.average).toBeCloseTo(7.05);expect(stats.highest).toBe(8.3);});
 it('derives only actual subject labels and readable tier names',()=>{expect(inventorySubjects(entries)).toEqual(['Bedrijfseconomie','Engels','Wiskunde A']);expect(tierLabel('iridescent')).toBe('9,5 en hoger');expect(tierLabel('neutral')).toBe('Letter/teken of *');});
});
