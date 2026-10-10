// This study changes presentation only; actual articles and interactions are reused.
document.documentElement.dataset.prototype = 'cold-reading';
const header = document.querySelector('.reading-header');
if (header) {
  const label = document.createElement('small');
  label.className = 'study-label';
  label.textContent = '阅读配色试稿';
  header.querySelector('.reading-site').append(label);
}
if (new URLSearchParams(location.search).get('cut') === 'note') {
  const observer = new MutationObserver(() => {
    if (document.body.dataset.reading === 'open') {
      observer.disconnect();
      document.getElementById('close-reader').click();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-reading'] });
}
