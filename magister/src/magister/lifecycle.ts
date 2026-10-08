export const nativeGradeSelector='#cijfers-laatst-behaalde-resultaten-container,#cijfers-container';
export function gradeRoute(url:Pick<Location,'pathname'|'hash'>){
 return !/(?:login|logout|auth|callback|signin|signout)/i.test(url.pathname)&&/^#\/cijfers(?:\/|$|\?)/i.test(url.hash);
}
export function loginVisible(root:Document){
 return !!root.querySelector('input[type="password"],form[action*="login" i],#login-container,[data-page="login"]');
}
/** A hash alone is not proof: Magister can keep #/cijfers during sign-in. */
export function gradeAnchor(root:Document,url:Pick<Location,'pathname'|'hash'>):HTMLElement|null{
 if(!gradeRoute(url)||loginVisible(root))return null;
 return [...root.querySelectorAll<HTMLElement>(nativeGradeSelector)].find(node=>node.parentElement&&!node.parentElement.closest(nativeGradeSelector))??null;
}
