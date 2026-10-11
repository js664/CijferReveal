import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const html=readFileSync('../website/index.html','utf8');
const page=new DOMParser().parseFromString(html,'text/html');
it('offers two provider downloads behind an accessible chooser',()=>{
 const trigger=page.querySelector('.download-trigger')!;
 expect(trigger.tagName).toBe('BUTTON');expect(trigger.getAttribute('aria-expanded')).toBe('false');expect(trigger.getAttribute('aria-controls')).toBe('download-options');
 const options=[...page.querySelectorAll('.provider-option')];
 expect(options.map(link=>link.textContent?.trim())).toEqual(['SOMtoday','MagisterVoorlopige versie']);
 expect(options.map(link=>link.getAttribute('href'))).toEqual(['https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal.zip','https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal-Magister.zip']);
 expect(page.querySelector('#download-options')?.hasAttribute('inert')).toBe(true);expect(html).toContain('__EXTENSION_VERSION__');expect(html).not.toContain('api.github.com');
 expect(page.querySelector('script[src="download.js"]')).toBeTruthy();expect(page.querySelector('noscript')?.textContent).toContain('Download Magister');
});
it('offers working store links before optional ZIP downloads and preserves FAQ',()=>{
 const stores=[...page.querySelectorAll('.store-button')];expect(stores).toHaveLength(2);
 expect(stores.map(link=>link.tagName)).toEqual(['A','A']);
 expect(stores.map(link=>link.getAttribute('href'))).toEqual([
  'https://chromewebstore.google.com/detail/cijferreveal-voor-somtoda/jkeojbochgppoajlapjbhhhckcciojgj',
  'https://addons.mozilla.org/addon/pack-opening-voor-somtoday/'
 ]);
 expect(page.querySelector('main > a')).toBe(stores[0]);
 const manual=page.querySelector('.manual-download')!;
 expect(manual.tagName).toBe('DETAILS');expect(manual.hasAttribute('open')).toBe(false);
 expect(manual.querySelector('.download-trigger')).toBeTruthy();
 expect(stores.every(link=>!!(link.compareDocumentPosition(manual)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 expect(page.querySelector('#faq-dialog')?.textContent).toContain('SOMtoday of Magister');expect(page.querySelector('.faq-link')?.getAttribute('aria-controls')).toBe('faq-dialog');
});
