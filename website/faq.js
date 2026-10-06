const faqDialog = document.querySelector('#faq-dialog');
const faqTrigger = document.querySelector('.faq-link');
let closeTimer;

function syncFaq() {
  clearTimeout(closeTimer);
  if (location.hash === '#faq') {
    if (!faqDialog.open) {
      faqDialog.showModal();
      faqDialog.getBoundingClientRect();
    }
    requestAnimationFrame(() => {
      if (faqDialog.open && location.hash === '#faq') faqDialog.classList.add('is-visible');
    });
  } else if (faqDialog.open) {
    faqDialog.classList.remove('is-visible');
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    closeTimer = setTimeout(() => {
      faqDialog.close();
      faqTrigger.focus({preventScroll: true});
    }, delay);
  }
}

function closeFaq() {
  history.replaceState(null, '', location.pathname + location.search);
  syncFaq();
}

faqDialog.querySelector('.faq-close').addEventListener('click', closeFaq);
faqDialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeFaq();
});
let startedOnBackdrop = false;
function onBackdrop(event) {
  const bounds = faqDialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
}
faqDialog.addEventListener('pointerdown', event => { startedOnBackdrop = onBackdrop(event); });
faqDialog.addEventListener('click', event => {
  if (startedOnBackdrop && onBackdrop(event)) closeFaq();
  startedOnBackdrop = false;
});
window.addEventListener('hashchange', syncFaq);
syncFaq();
