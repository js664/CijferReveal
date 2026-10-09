import {afterEach,expect,it} from 'vitest';
import {act} from '@testing-library/react';
import {cardFields,readCardTuple} from '../src/somtoday/dom-card';
import {joinCard} from '../src/somtoday/dom-join';
import {nativeCardValues,presentCard} from '../src/spoiler/recent-card';
import {nativeCard,record,key,version} from './fixtures';

afterEach(()=>document.body.replaceChildren());
function owner(){document.body.innerHTML=nativeCard();return document.querySelector<HTMLElement>('sl-laatste-resultaat-item')!;}
function badge(text:string){const label=document.createElement('hmy-unknown-label');label.textContent=text;return label;}
const display={key,version,subject:'Wiskunde A',description:'Hoofdstuk 3',date:'2026-10-04',weight:'2',value:'8,3',grade:8.3};

it('reproduces contamination by a trajectory label with the previous textContent parser',()=>{
 const card=owner();card.querySelector('.titel')!.append(badge('HAVO'));
 const oldTuple={subject:card.querySelector('.titel')!.textContent!,subtitle:card.querySelector('.subtitel')!.textContent!,...nativeCardValues(card)};
 expect(oldTuple.subject).toBe('Wiskunde AHAVO');expect(joinCard(oldTuple,[record()])).toBeNull();
 expect(readCardTuple(card)).toMatchObject({subject:'Wiskunde A',date:'4 okt',description:'Hoofdstuk 3',value:'8,3',weight:'2x'});
 expect(joinCard(readCardTuple(card),[record()])?.id).toBe('fixture-result-a');
});

it.each(['HAVO','VWO','Onbekend traject','★ Ω 9,9','HAVO / VWO / vrije tekst'])('ignores additional %s labels in and around understood fields',label=>{
 const card=owner();
 for(const field of Object.values(cardFields(card)))field?.append(badge(label));
 card.querySelector('.titel')!.prepend(badge(label));
 card.querySelector('.details')!.prepend(badge(label));
 const metadata=document.createElement('div');metadata.className='metadata';metadata.innerHTML='<div class="titel">Ander vak</div><div class="subtitel">9 okt · Andere toets</div><div class="weging">99x</div><div class="cijfer">2,1</div>';
 card.querySelector('.root')!.prepend(metadata);
 expect(readCardTuple(card)).toMatchObject({subject:'Wiskunde A',date:'4 okt',description:'Hoofdstuk 3',value:'8,3',weight:'2x'});
 expect(joinCard(readCardTuple(card),[record()])?.id).toBe('fixture-result-a');
});

it('ignores arbitrary native badge elements beside direct field text',()=>{
 const card=owner();
 for(const selector of ['.titel','.subtitel','.weging'])card.querySelector(selector)!.insertAdjacentHTML('beforeend','<span class="anything-at-all">Unknown</span><small>VWO</small><label>HAVO</label><span>More unrelated text</span>');
 expect(joinCard(readCardTuple(card),[record()])?.id).toBe('fixture-result-a');
});

it('supports the production title-container and info/wegingcijfer layout without consuming metadata siblings',()=>{
 const card=owner(),title=card.querySelector('.titel')!,titleContainer=document.createElement('div');titleContainer.className='titel-container';title.before(titleContainer);titleContainer.append(badge('VWO'),title,badge('HAVO'));
 const values=card.querySelector('.wegingcijfer')!,info=document.createElement('div');info.className='info';values.before(info);info.append(badge('Unknown'),values);
 expect(joinCard(readCardTuple(card),[record()])?.id).toBe('fixture-result-a');
});

it('accepts a single neutral formatting wrapper and preserves punctuation in the assessment',()=>{
 const card=owner();card.querySelector('.titel')!.innerHTML='<span><strong>Wiskunde A</strong></span><hmy-new-badge>HAVO</hmy-new-badge>';
 card.querySelector('.subtitel')!.innerHTML='<span>4 okt · Hoofdstuk 3 - deel A • B</span><hmy-new-badge>VWO</hmy-new-badge>';
 expect(readCardTuple(card).description).toBe('Hoofdstuk 3 - deel A • B');
 expect(joinCard(readCardTuple(card),[record({description:'Hoofdstuk 3 - deel A • B'})])?.id).toBe('fixture-result-a');
});

it.each(['O','V','G','*','好','🧪','é'])('reads the dedicated Unicode result %s even with numeric metadata elsewhere',value=>{
 const card=owner();card.querySelector('.cijfer > span')!.textContent=value;card.querySelector('.cijfer')!.append(badge('6,3'));card.querySelector('.root')!.prepend(badge('HAVO 9,9 4x'));
 expect(readCardTuple(card).value).toBe(value);
 expect(joinCard(readCardTuple(card),[record({value,isCijfer:false,isLabel:true})])?.value).toBe(value);
});

it.each([['.titel','Engels'],['.subtitel','5 okt · Hoofdstuk 3'],['.subtitel','4 okt · Hoofdstuk 30'],['.weging','3x'],['.cijfer > span','7,0']])('still rejects a changed identity field %s', (selector,text)=>{
 const card=owner();card.querySelector(selector)!.textContent=text;card.querySelector('.root')!.append(badge('HAVO'));
 expect(joinCard(readCardTuple(card),[record()])).toBeNull();
});

it('does not use ignored labels to choose between genuinely distinct logical results',()=>{
 const card=owner();card.querySelector('.titel')!.append(badge('HAVO'));
 expect(joinCard(readCardTuple(card),[record({id:'havo-result'}),record({id:'vwo-result'})])).toBeNull();
});

it('does not match an assignment merely because its description is a substring',()=>{
 const card=owner();
 const wrong=record({id:'similar-assignment',description:'Hoofdstuk'});
 expect(joinCard(readCardTuple(card),[wrong])).toBeNull();
 expect(joinCard(readCardTuple(card),[wrong,record()])?.id).toBe('fixture-result-a');
});

it('has no complete-card fallback for missing or ambiguous dedicated fields',()=>{
 const card=owner();card.querySelector('.wegingcijfer')!.append(card.querySelector('.cijfer')!.cloneNode(true));
 expect(readCardTuple(card).value).toBe('');expect(joinCard(readCardTuple(card),[record()])).toBeNull();
 card.querySelector('.details')!.remove();expect(readCardTuple(card).subject).toBe('');
 expect(joinCard(readCardTuple(card),[record()])).toBeNull();
});

it('does not guess between multiple unmarked grade text wrappers',()=>{
 const card=owner();card.querySelector('.cijfer')!.insertAdjacentHTML('beforeend','<span>7,0</span>');
 expect(readCardTuple(card).value).toBe('');expect(joinCard(readCardTuple(card),[record(),record({id:'other',value:'7,0'})])).toBeNull();
});

it('preserves the original field values through masking and metadata updates without altering badges',async()=>{
 const card=owner();for(const field of Object.values(cardFields(card)))field?.append(badge('HAVO'));
 const presentation=await act(async()=>presentCard(card,record(),'pending',display,()=>{}));
 expect(card.querySelector('.cijfer > span')!.textContent).toBe('?');expect(card.querySelector('.cijfer hmy-unknown-label')!.textContent).toBe('HAVO');
 expect(nativeCardValues(card)).toEqual({value:'8,3',weight:'2x'});
 card.querySelector('.cijfer hmy-unknown-label')!.textContent='VWO';
 expect(joinCard(readCardTuple(card,nativeCardValues(card)),[record()])?.id).toBe('fixture-result-a');
 await act(()=>presentation.update(record(),'opened',display,()=>{}));
 expect(card.querySelector('.cijfer > span')!.textContent).toBe('8,3');expect(card.querySelector('.cijfer hmy-unknown-label')!.textContent).toBe('VWO');
 await act(()=>presentation.dispose());
});

it('does not reuse a masked snapshot after SOMtoday replaces the actual grade text',async()=>{
 const card=owner();const presentation=await act(async()=>presentCard(card,record(),'pending',display,()=>{}));
 card.querySelector('.cijfer > span')!.textContent='7,0';
 expect(nativeCardValues(card).value).toBe('7,0');
 expect(joinCard(readCardTuple(card,nativeCardValues(card)),[record()])).toBeNull();
 await act(()=>presentation.dispose());
});
