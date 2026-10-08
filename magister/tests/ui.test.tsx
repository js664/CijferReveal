import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('Magister shields known native grade containers without hiding the login page',()=>{const css=readFileSync('src/spoiler/shield.css','utf8');for(const selector of ['#cijfers-laatst-behaalde-resultaten-container','#cijfers-container','.cijfers-k-grid.k-grid'])expect(css).toContain(selector);expect(css).toContain('html[data-po-magister-grades]');expect(css).not.toContain('body { visibility');});
