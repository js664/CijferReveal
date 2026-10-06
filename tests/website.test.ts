import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const page=new DOMParser().parseFromString(readFileSync('website/index.html','utf8'),'text/html');

it('puts the permanent latest ZIP download first and keeps the other actions in the requested order',()=>{
 const actions=[...page.querySelectorAll('main > a, main > button')];
 expect(actions.map(node=>node.textContent?.replace(/\s+/g,' ').trim())).toEqual([
  'Download laatste versie v__EXTENSION_VERSION__',
  'Chrome Web Store — Binnenkort',
  'Bekijk broncode op GitHub'
 ]);
 expect(actions[0].tagName).toBe('A');
 expect(actions[0].getAttribute('href')).toBe('https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal.zip');
 expect(actions[1].tagName).toBe('BUTTON');
 expect((actions[1] as HTMLButtonElement).disabled).toBe(true);
 expect(actions[2].getAttribute('href')).toBe('https://github.com/js664/CijferReveal');
 expect(actions[2].getAttribute('target')).toBe('_blank');
 expect(actions[2].getAttribute('rel')).toContain('noopener');
 const html=readFileSync('website/index.html','utf8');
 expect(html).toContain('__EXTENSION_VERSION__');
 expect(html).toContain('Bestand: <span id="download-filename">CijferReveal.zip</span> · versie v__EXTENSION_VERSION__');
 expect(html).toContain("https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal.zip");
 expect(html).not.toContain('api.github.com');
});
