import type {CardTuple} from './dom-join';

function single(parent:Element|null,selector:string):HTMLElement|null{
 const nodes=parent?.querySelectorAll<HTMLElement>(selector);
 return nodes?.length===1?nodes[0]:null;
}

/** Read only SOMtoday's dedicated fields, never the complete card text. */
export function cardFields(owner:HTMLElement){
 const card=owner.matches('sl-resultaat-item')?owner:single(owner,'sl-resultaat-item');
 const root=single(card,':scope > .root');
 const details=single(root,':scope > .details');
 const values=single(root,':scope > .wegingcijfer, :scope > .info > .wegingcijfer');
 return {
  title:single(details,':scope > .titel, :scope > .titel-container > .titel'),
  alternativeLabel:single(details,':scope > .titel-container > .titel-postfix'),
  subtitle:single(details,':scope > .subtitel'),
  grade:single(values,':scope > .cijfer'),
  weight:single(values,':scope > .weging')
 };
}

/** Own text is authoritative. A single neutral formatting wrapper is allowed;
 * widgets, badges and unknown semantic children cannot become field content.
 * Multiple unmarked text wrappers are ambiguous and are not guessed at.
 */
export function fieldTextNodes(field:HTMLElement|null):Text[]{
 if(!field)return [];
 const own=[...field.childNodes].filter((node):node is Text=>node.nodeType===Node.TEXT_NODE&&!!node.nodeValue?.trim());
 if(own.length)return own;
 const wrappers=[...field.children].filter((node):node is HTMLElement=>
  node instanceof HTMLElement&&/^(SPAN|STRONG|B|EM)$/.test(node.tagName)&&
  !node.hasAttribute('role')&&!node.hasAttribute('hidden')&&!node.hasAttribute('aria-hidden')&&
  !node.hasAttribute('aria-label')&&![...node.attributes].some(attr=>attr.name.startsWith('data-'))&&
  [...node.classList].every(name=>name.startsWith('ng-'))
 );
 return wrappers.length===1?fieldTextNodes(wrappers[0]):[];
}
export const fieldText=(field:HTMLElement|null)=>fieldTextNodes(field).map(node=>node.nodeValue??'').join('').trim();

export function readCardTuple(owner:HTMLElement,native?:{value:string;weight:string}):CardTuple{
 const fields=cardFields(owner),subtitle=fieldText(fields.subtitle);
 const separator=/[•·–—]|\s+-\s+/.exec(subtitle);
 const date=separator?subtitle.slice(0,separator.index).trim():subtitle;
 const description=separator?subtitle.slice(separator.index+separator[0].length).trim():'';
 return {
  subject:fieldText(fields.title),subtitle,date,description,
  // The production template reserves this sibling for alternative norming.
  // Its wording is not part of the subject, nor a list of supported levels.
  alternative:fieldText(fields.alternativeLabel)?true:undefined,
  value:native?.value??fieldText(fields.grade),weight:native?.weight??fieldText(fields.weight),
  kind:owner.matches('sl-vakresultaat-item')?'subject':'recent',
  family:owner.closest('sl-examenresultaten')?'exam':owner.closest('sl-voortgangsresultaten')?'progression':undefined
 };
}
