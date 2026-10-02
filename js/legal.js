// Sets the "last updated" date on legal pages.
document.querySelectorAll('[data-last-updated]').forEach((el) => {
  el.textContent = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});