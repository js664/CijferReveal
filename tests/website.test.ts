import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const page=new DOMParser().parseFromString(readFileSync('website/index.html','utf8'),'text/html');

it('puts the permanent latest ZIP download first and keeps the other actions in the requested order',()=>{
 const actions=[...page.querySelectorAll('main > a, main > button')];
 expect(actions.map(node=>node.textContent?.replace(/\s+/g,' ').trim())).toEqual([
  'Download laatste versie v__EXTENSION_VERSION__',
  'Chrome Web Store — Binnenkort',
  'Firefox — Binnenkort',
  'Bekijk broncode op GitHub',
  'Hulp en veelgestelde vragen'
 ]);
 expect(actions[0].tagName).toBe('A');
 expect(actions[0].getAttribute('href')).toBe('https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal.zip');
 expect(actions[1].tagName).toBe('BUTTON');
 expect((actions[1] as HTMLButtonElement).disabled).toBe(true);
 expect(actions[2].tagName).toBe('BUTTON');
 expect((actions[2] as HTMLButtonElement).disabled).toBe(true);
 expect(actions[3].getAttribute('href')).toBe('https://github.com/js664/CijferReveal');
 expect(actions[3].getAttribute('target')).toBe('_blank');
 expect(actions[3].getAttribute('rel')).toContain('noopener');
 expect(actions[4].getAttribute('href')).toBe('#faq');
 expect(actions[4].getAttribute('aria-controls')).toBe('faq-dialog');
 const html=readFileSync('website/index.html','utf8');
 expect(html).toContain('__EXTENSION_VERSION__');
 expect(html).not.toContain('download-note');
 expect(html).toContain("https://github.com/js664/CijferReveal/releases/latest/download/CijferReveal.zip");
 expect(html).not.toContain('api.github.com');
});

it('keeps the FAQ limited to the animation help',()=>{
 const faq=page.querySelector('#faq-dialog')!;
 expect([...faq.querySelectorAll('summary')].map(node=>node.textContent?.trim())).toEqual([
  'De draaianimatie ontbreekt. Hoe los ik dat op?'
 ]);
 expect(faq.textContent).not.toContain('Je kunt de nieuwste versie direct downloaden');
 expect(faq.textContent).not.toContain('Een kleiner scherm');
});
