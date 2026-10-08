import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const html=readFileSync('website/index.html','utf8');
const page=new DOMParser().parseFromString(html,'text/html');
it('offers two provider downloads behind an accessible chooser',()=>{
 const trigger=page.querySelector('.download-trigger')!;
 expect(trigger.tagName).toBe('BUTTON');expect(trigger.getAttribute('aria-expanded')).toBe('false');expect(trigger.getAttribute('aria-controls')).toBe('download-options');
 const options=[...page.querySelectorAll('.provider-option')];
 expect(options.map(link=>link.textContent?.trim())).toEqual(['SOMtoday','MagisterVoorlopige versie']);
 expect(options.map(link=>link.getAttribute('href'))).toEqual(['https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal.zip','https://github.com/js664/CijferReveal/releases/download/magister-v__EXTENSION_VERSION__/CijferReveal-Magister.zip']);
 expect(page.querySelector('#download-options')?.hasAttribute('inert')).toBe(true);expect(html).toContain('__EXTENSION_VERSION__');expect(html).not.toContain('api.github.com');
 expect(page.querySelector('script[src="download.js"]')).toBeTruthy();expect(page.querySelector('noscript')?.textContent).toContain('Download Magister');
});
it('preserves disabled store actions and FAQ',()=>{
 const stores=[...page.querySelectorAll('.store-button')];expect(stores).toHaveLength(2);expect(stores.every(button=>(button as HTMLButtonElement).disabled)).toBe(true);
 expect(page.querySelector('#faq-dialog')?.textContent).toContain('SOMtoday of Magister');expect(page.querySelector('.faq-link')?.getAttribute('aria-controls')).toBe('faq-dialog');
});
