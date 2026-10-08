import {afterEach,it,expect} from 'vitest';
import {inventoryParent,hideInventoryContent} from '../src/collection/InventoryMount';
afterEach(()=>document.body.replaceChildren());

it('keeps the native route, header and navigation mounted while replacing only content',()=>{
 document.body.innerHTML='<sl-cijfers><div class="layout"><header>SOMtoday</header><sl-tab-bar><button>Inventaris</button></sl-tab-bar><main><h1>Cijfers</h1><sl-laatsteresultaten>Grades</sl-laatsteresultaten></main></div></sl-cijfers>';
 const route=document.querySelector<HTMLElement>('sl-cijfers')!,origin=document.querySelector('button')!;
 const parent=inventoryParent(route,origin);expect(parent.tagName).toBe('MAIN');
 const host=document.createElement('div');parent.append(host);const restore=hideInventoryContent(parent,host,origin);
 expect(route.hidden).toBe(false);expect(route.inert).not.toBe(true);expect(document.querySelector<HTMLElement>('header')!.hidden).toBe(false);expect(origin.closest<HTMLElement>('sl-tab-bar')!.hidden).toBe(false);expect(parent.hidden).toBe(false);expect(document.querySelector<HTMLElement>('sl-laatsteresultaten')!.hidden).toBe(true);expect(host.hidden).toBe(false);
 restore();expect(document.querySelector<HTMLElement>('sl-laatsteresultaten')!.hidden).toBe(false);
});

it('restores native visibility precisely while retaining later unrelated style changes',()=>{
 document.body.innerHTML='<sl-cijfers><section style="display: grid !important; color: red" aria-hidden="false"><sl-laatsteresultaten/></section></sl-cijfers><button>Inventaris</button>';
 const route=document.querySelector<HTMLElement>('sl-cijfers')!,origin=document.querySelector('button')!,host=document.createElement('div');route.append(host);
 const content=document.querySelector<HTMLElement>('section')!,restore=hideInventoryContent(route,host,origin);content.style.color='blue';restore();
 expect(content.style.display).toBe('grid');expect(content.style.getPropertyPriority('display')).toBe('important');expect(content.style.color).toBe('blue');expect(content.getAttribute('aria-hidden')).toBe('false');expect(content.hidden).toBe(false);expect(content.inert).not.toBe(true);
});

it('conceals asynchronously mounted grade content without hiding a nested tab bar',async()=>{
 document.body.innerHTML='<sl-cijfers><div class="layout"><sl-tab-bar><button>Inventaris</button></sl-tab-bar></div></sl-cijfers>';
 const route=document.querySelector<HTMLElement>('sl-cijfers')!,origin=document.querySelector('button')!,host=document.createElement('div');route.append(host);const restore=hideInventoryContent(route,host,origin);
 const grades=document.createElement('sl-laatsteresultaten');document.querySelector('.layout')!.append(grades);await Promise.resolve();
 expect(grades.hidden).toBe(true);expect(origin.closest<HTMLElement>('sl-tab-bar')!.hidden).toBe(false);expect(document.querySelector<HTMLElement>('.layout')!.hidden).toBe(false);restore();expect(grades.hidden).toBe(false);
});
