import {it,expect,afterEach} from 'vitest';
import {gradeRoute,gradeAnchor} from '../src/magister/lifecycle';
afterEach(()=>document.body.replaceChildren());
it('leaves login and callback pages with a saved grade hash untouched',()=>{
 for(const pathname of ['/login','/auth/callback','/logout','/signin'])expect(gradeRoute({pathname,hash:'#/cijfers'})).toBe(false);
 document.body.innerHTML='<div class="view ng-scope"><div id="cijfers-container"><form><input type="password"></form></div></div>';
 expect(gradeAnchor(document,{pathname:'/',hash:'#/cijfers'})).toBeNull();
 expect(document.querySelector('#cijfers-container')?.getAttribute('aria-hidden')).toBeNull();
});
it('requires a known native container before replacing an Angular view',()=>{
 document.body.innerHTML='<div class="view ng-scope"><form><input name="username"></form></div>';
 expect(gradeAnchor(document,{pathname:'/',hash:'#/cijfers'})).toBeNull();
 document.querySelector('form')!.replaceWith(Object.assign(document.createElement('div'),{id:'cijfers-container'}));
 expect(gradeAnchor(document,{pathname:'/',hash:'#/cijfers'})?.id).toBe('cijfers-container');
 expect(gradeAnchor(document,{pathname:'/',hash:'#/vandaag'})).toBeNull();
});
