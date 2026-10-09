import {memo,useEffect,useMemo,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import {useReducedMotion} from 'motion/react';
import type {CollectionEntry} from '../state/schema';
import {tierFor} from '../opening/tiers';
import {parseSomtodayDate} from '../results/date-parser';
import {filterInventory,inventorySubjects,tierLabel,type InventorySort} from './model';

const openedFormat=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
function dateLabel(value:string){const date=parseSomtodayDate(value);return value&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(date):'Datum onbekend';}
function fullDateLabel(value:string){const date=parseSomtodayDate(value);return value&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric'}).format(date):'Datum onbekend';}
function openedLabel(value:number){const date=new Date(value);return Number.isNaN(date.getTime())?'Datum onbekend':openedFormat.format(date);}
function subjectMark(subject:string){return subject.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('nl-NL')||'•';}
function weightLabel(weight:string){const normalized=weight.trim().replace(/\s*[x×]$/i,'');return normalized?`${normalized}x`:null;}

function InventoryDropdown({label,value,options,open,onToggle,onClose,onChange}:{label:string;value:string;options:{value:string;label:string}[];open:boolean;onToggle:()=>void;onClose:()=>void;onChange:(value:string)=>void}){
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);const listId=`po-inventory-list-${label.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`;
 const activeIndex=Math.max(0,options.findIndex(option=>option.value===value));
 const focusOption=(index:number)=>requestAnimationFrame(()=>root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index]?.focus());
 const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();onClose();trigger.current?.focus();return;}
  if((event.key==='ArrowDown'||event.key==='ArrowUp')&&event.target===trigger.current){event.preventDefault();if(!open)onToggle();focusOption(activeIndex);return;}
  if(open&&(event.key==='ArrowDown'||event.key==='ArrowUp')&&event.target instanceof HTMLElement&&event.target.matches('[role="option"]')){event.preventDefault();const optionsEls=[...root.current!.querySelectorAll<HTMLButtonElement>('[role="option"]')],at=optionsEls.indexOf(event.target as HTMLButtonElement),step=event.key==='ArrowDown'?1:-1;optionsEls[(at+step+optionsEls.length)%optionsEls.length]?.focus();}
 };
 return <div ref={root} className="po-inventory-dropdown" onKeyDown={onKeyDown} onBlur={event=>{if(!open)return;const current=event.currentTarget;requestAnimationFrame(()=>{const tree=current.getRootNode(),focused=tree instanceof ShadowRoot?tree.activeElement:document.activeElement;if(!current.contains(focused))onClose();});}}>
  <span className="po-inventory-dropdown-label">{label}</span>
  <button ref={trigger} type="button" className="po-inventory-select" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={onToggle}>
   <span>{options.find(option=>option.value===value)?.label??options[0]?.label}</span><svg className={open?'is-open':''} viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>
  </button>
  {open&&<div className="po-inventory-options" id={listId} role="listbox" aria-label={label}>{options.map(option=><button key={option.value} type="button" role="option" data-value={option.value} aria-selected={option.value===value} className="po-inventory-option" onClick={()=>{onChange(option.value);onClose();trigger.current?.focus();}}>{option.label}</button>)}</div>}
 </div>;
}

const GradeCard=memo(function GradeCard({entry,reduced,onOpen}:{entry:CollectionEntry;reduced:boolean;onOpen:(entry:CollectionEntry,trigger:HTMLButtonElement)=>void}){
 const ref=useRef<HTMLDivElement>(null);const buttonRef=useRef<HTMLButtonElement>(null);const rect=useRef<DOMRect|null>(null);const pointer=useRef({x:0,y:0});const frame=useRef<number|undefined>(undefined);const tier=tierFor(entry.grade);
 useEffect(()=>()=>{if(frame.current!==undefined)cancelAnimationFrame(frame.current);},[]);
 const onEnter=(event:PointerEvent<HTMLDivElement>)=>{if(reduced||event.pointerType!=='mouse')return;const card=ref.current;if(!card)return;rect.current=card.getBoundingClientRect();card.classList.add('po-grade-hover');};
 const onMove=(event:PointerEvent<HTMLDivElement>)=>{
  if(reduced||event.pointerType!=='mouse')return;
  const card=ref.current,bounds=rect.current;if(!card||!bounds||!bounds.width||!bounds.height)return;
  pointer.current={x:event.clientX,y:event.clientY};card.classList.add('po-grade-follow');
  if(frame.current!==undefined)return;
  frame.current=requestAnimationFrame(()=>{frame.current=undefined;const {x:clientX,y:clientY}=pointer.current;const x=Math.max(0,Math.min(1,(clientX-bounds.left)/bounds.width)),y=Math.max(0,Math.min(1,(clientY-bounds.top)/bounds.height));card.style.setProperty('--grade-rx',`${(0.5-y)*3}deg`);card.style.setProperty('--grade-ry',`${(x-0.5)*3}deg`);card.style.setProperty('--grade-gx',`${x*100}%`);card.style.setProperty('--grade-gy',`${y*100}%`);});
 };
 const reset=()=>{const card=ref.current;if(frame.current!==undefined){cancelAnimationFrame(frame.current);frame.current=undefined;}rect.current=null;if(!card)return;card.style.setProperty('--grade-rx','0deg');card.style.setProperty('--grade-ry','0deg');card.classList.remove('po-grade-follow','po-grade-hover');};
 return <div ref={ref} className="po-inventory-motion" onPointerEnter={onEnter} onPointerMove={onMove} onPointerLeave={reset} onPointerCancel={reset}>
  <button ref={buttonRef} type="button" className={`po-inventory-card po-tier-${tier.name}`} data-tier={tier.name} style={{'--grade-tier':tier.color} as React.CSSProperties} aria-haspopup="dialog" aria-label={`${entry.subject||'Vak'}, cijfer ${entry.value}, ${entry.description||'Resultaat'}. Details bekijken`} onClick={()=>buttonRef.current&&onOpen(entry,buttonRef.current)}>
   <span className="po-grade-card-shell">
    <span className="po-grade-card-glare" aria-hidden="true"/>
    <span className="po-grade-card-header"><span className="po-grade-card-subject">{entry.subject||'Vak'}</span><span className="po-grade-card-tier" aria-hidden="true"/></span>
    <span className="po-grade-card-main"><strong className="po-grade-card-value">{entry.value}</strong><span className="po-grade-card-assessment">{entry.description||'Resultaat'}</span></span>
    <span className="po-grade-card-footer"><span>{dateLabel(entry.date)}</span>{weightLabel(entry.weight)&&<><span aria-hidden="true">·</span><span>{weightLabel(entry.weight)}</span></>}</span>
   </span>
  </button>
 </div>;
});

export function CollectionView({entries,verified,onGoGrades}:{entries:CollectionEntry[];verified:boolean;onGoGrades:()=>void}){
 const reduced=!!useReducedMotion();const subjects=useMemo(()=>inventorySubjects(entries),[entries]);
 const [query,setQuery]=useState(''),[subject,setSubject]=useState(''),[tier,setTier]=useState(''),[sort,setSort]=useState<InventorySort>('newest'),[filtersOpen,setFiltersOpen]=useState(false),[openMenu,setOpenMenu]=useState<string|null>(null),[selected,setSelected]=useState<CollectionEntry|null>(null);
 const dialogRef=useRef<HTMLDialogElement>(null);const closeRef=useRef<HTMLButtonElement>(null);const openerRef=useRef<HTMLButtonElement|null>(null);
 const visible=useMemo(()=>filterInventory(entries,{query,subject,tier,sort}),[entries,query,subject,tier,sort]);
 const activeCount=Number(!!query.trim())+Number(!!subject)+Number(!!tier);const hasControls=activeCount>0||sort!=='newest';
 useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;if(selected){if(!dialog.open)dialog.showModal();requestAnimationFrame(()=>closeRef.current?.focus());}else if(dialog.open)dialog.close();},[selected]);
 const closeDetails=()=>{setSelected(null);requestAnimationFrame(()=>{if(openerRef.current?.isConnected)openerRef.current.focus();openerRef.current=null;});};
 const clearFilters=()=>{setQuery('');setSubject('');setTier('');setSort('newest');};
 const removeQuery=()=>setQuery('');const removeSubject=()=>setSubject('');const removeTier=()=>setTier('');
 return <section className="po-inventory-page" id="po-inventory-page" role="tabpanel" aria-labelledby="po-inventory-tab" tabIndex={-1}>
  <div className="po-inventory-inner">
   <header className="po-inventory-heading"><div className="po-inventory-title"><h1 id="po-inventory-title">Inventaris</h1><span className="po-inventory-count">{entries.length} geopend</span></div></header>
   {!verified?<section className="po-inventory-empty"><h2>Open eerst Cijfers</h2><p>Je inventaris wordt geladen zodra je cijfers zijn gecontroleerd.</p><button type="button" onClick={onGoGrades}>Naar Cijfers</button></section>:!entries.length?<section className="po-inventory-empty"><h2>Nog geen geopende cijfers</h2><p>Open een cijfer om het hier terug te zien.</p><button type="button" onClick={onGoGrades}>Naar Cijfers</button></section>:<>
    <section className="po-inventory-toolbar" aria-label="Zoeken en filteren">
     <label className="po-inventory-search"><span className="po-visually-hidden">Zoek op vak of toets</span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input type="search" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'&&query){event.preventDefault();setQuery('');}}} placeholder="Zoek vak of toets"/></label>
     <button className="po-inventory-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="po-inventory-filter-panel" onClick={()=>setFiltersOpen(value=>!value)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M5.5 10h9M8 15h4"/></svg><span>Filters</span>{activeCount>0&&<span className="po-inventory-filter-badge" aria-label={`${activeCount} actieve filters`}>{activeCount}</span>}<svg className={`po-filter-chevron${filtersOpen?' is-open':''}`} viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></button>
    </section>
    <section className="po-inventory-filter-panel" id="po-inventory-filter-panel" aria-label="Filters" hidden={!filtersOpen}>
     <InventoryDropdown label="Vak" value={subject} open={openMenu==='subject'} onToggle={()=>setOpenMenu(openMenu==='subject'?null:'subject')} onClose={()=>setOpenMenu(null)} onChange={setSubject} options={[{value:'',label:'Alle vakken'},...subjects.map(item=>({value:item,label:item}))]}/>
     <InventoryDropdown label="Cijfergroep" value={tier} open={openMenu==='tier'} onToggle={()=>setOpenMenu(openMenu==='tier'?null:'tier')} onClose={()=>setOpenMenu(null)} onChange={setTier} options={[{value:'',label:'Alle cijfers'},...['crimson','bronze','steel','gold','electric','iridescent','neutral'].map(item=>({value:item,label:tierLabel(item)}))]}/>
     <InventoryDropdown label="Sorteren" value={sort} open={openMenu==='sort'} onToggle={()=>setOpenMenu(openMenu==='sort'?null:'sort')} onClose={()=>setOpenMenu(null)} onChange={value=>setSort(value as InventorySort)} options={[{value:'newest',label:'Nieuwste eerst'},{value:'oldest',label:'Oudste eerst'},{value:'highest',label:'Hoogste cijfer'},{value:'lowest',label:'Laagste cijfer'}]}/>
    </section>
    {hasControls&&<section className="po-inventory-active-filters" aria-label="Actieve filters">
     {query.trim()&&<button type="button" className="po-filter-chip" aria-label={`Verwijder zoekfilter ${query.trim()}`} onClick={removeQuery}><span>Zoekopdracht: {query.trim()}</span><span aria-hidden="true">×</span></button>}
     {subject&&<button type="button" className="po-filter-chip" aria-label={`Verwijder vakfilter ${subject}`} onClick={removeSubject}><span>{subject}</span><span aria-hidden="true">×</span></button>}
     {tier&&<button type="button" className="po-filter-chip" aria-label={`Verwijder cijferfilter ${tierLabel(tier)}`} onClick={removeTier}><span>{tierLabel(tier)}</span><span aria-hidden="true">×</span></button>}
     {sort!=='newest'&&<button type="button" className="po-filter-chip" aria-label="Sortering terugzetten op nieuwste eerst" onClick={()=>setSort('newest')}><span>{sort==='oldest'?'Oudste eerst':sort==='highest'?'Hoogste cijfer':'Laagste cijfer'}</span><span aria-hidden="true">×</span></button>}
     <button className="po-inventory-clear" type="button" onClick={clearFilters}>Alles wissen</button>
    </section>}
    <div className="po-inventory-result-row"><p className="po-inventory-result-count" aria-live="polite">{visible.length} {visible.length===1?'resultaat':'resultaten'}</p></div>
    {visible.length?<section className="po-inventory-grid" aria-label="Geopende cijfers">{visible.map(entry=><GradeCard key={`${entry.key}:${entry.version}:${entry.openedAt}`} entry={entry} reduced={reduced} onOpen={(item,trigger)=>{openerRef.current=trigger;setSelected(item);}}/>)}</section>:<section className="po-inventory-no-results"><h2>Geen cijfers gevonden</h2><p>Pas je zoekopdracht of filters aan.</p><button type="button" onClick={clearFilters}>Alles wissen</button></section>}
   </>}
  </div>
  <dialog ref={dialogRef} className="po-grade-detail" aria-labelledby="po-grade-detail-title" style={selected?{'--detail-tier':tierFor(selected.grade).color} as React.CSSProperties:undefined} onCancel={event=>{event.preventDefault();closeDetails();}} onClose={()=>{if(selected)closeDetails();}} onClick={event=>{if(event.target===dialogRef.current)closeDetails();}}>
   {selected&&<div className="po-grade-detail-content"><button ref={closeRef} className="po-grade-detail-close" type="button" aria-label="Details sluiten" onClick={closeDetails}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button><span className="po-grade-detail-mark" aria-hidden="true">{subjectMark(selected.subject)}</span><p className="po-grade-detail-subject">{selected.subject||'Vak'}</p><h2 id="po-grade-detail-title" className="po-grade-detail-grade">{selected.value}</h2><p className="po-grade-detail-assessment">{selected.description||'Resultaat'}</p><dl className="po-grade-detail-meta"><div><dt>Datum</dt><dd>{fullDateLabel(selected.date)}</dd></div>{weightLabel(selected.weight)&&<div><dt>Weging</dt><dd>{weightLabel(selected.weight)}</dd></div>}<div><dt>Geopend</dt><dd>{openedLabel(selected.openedAt)}</dd></div></dl></div>}
  </dialog>
 </section>;
}
