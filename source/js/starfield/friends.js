// A native dialog keeps focus and the current room/camera in place. Plain links
// remain useful before the scene starts, with JavaScript off, or in a new tab.
export function createFriendsPanel() {
  const dialog = document.getElementById('friends-panel');
  if (!dialog) return;
  const sheet = dialog.querySelector('.friends-sheet');
  const closeButton = dialog.querySelector('[data-friends-close]');
  const entries = [...document.querySelectorAll('[data-friends-open]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const soft = () => preference.matches || document.body.dataset.motion === 'soft';
  let trigger = null;
  let animation = null;
  let revision = 0;
  let offset = { x: 0, y: 0 };
  let outsidePress = false;

  async function animate(frames, duration) {
    const current = animation = sheet.animate(frames, { duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    try { await current.finished; } catch { /* Superseded by a newer open/close. */ }
    if (animation === current) { current.cancel(); animation = null; }
  }

  async function open(source) {
    if (dialog.open) return;
    trigger = source;
    const ticket = ++revision;
    animation?.cancel();
    dialog.dataset.state = 'opening';
    document.body.dataset.friendsOpen = 'true';
    entries.forEach(entry => entry.setAttribute('aria-expanded', 'true'));
    dialog.querySelector('[data-friends-return]').textContent = document.body.dataset.room === 'inside' ? '回到窗边' : '回到星空';
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
    const bounds = dialog.getBoundingClientRect(), origin = source.getBoundingClientRect();
    offset = { x: Math.max(-32, Math.min(32, (origin.left + origin.width / 2 - bounds.left - bounds.width / 2) * .08)),
      y: Math.max(-24, Math.min(24, (origin.top + origin.height / 2 - bounds.top - bounds.height / 2) * .08)) };
    document.dispatchEvent(new CustomEvent('starry:friends', { detail: { open: true } }));
    await animate(soft() ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translate(${offset.x}px,${offset.y}px) scale(.965)` }, { opacity: 1, transform: 'none' }], soft() ? 140 : 440);
    if (ticket === revision && dialog.open) dialog.dataset.state = 'open';
  }

  async function close() {
    if (!dialog.open || dialog.dataset.state === 'closing') return;
    const ticket = ++revision;
    const style = getComputedStyle(sheet);
    const from = { opacity: style.opacity, transform: style.transform };
    animation?.cancel();
    dialog.dataset.state = 'closing';
    await animate([from, { opacity: 0, transform: soft() ? 'none' : `translate(${offset.x * .6}px,${offset.y * .6}px) scale(.985)` }], soft() ? 140 : 230);
    if (ticket === revision) dialog.close();
  }

  entries.forEach(entry => {
    entry.setAttribute('aria-expanded', 'false');
    entry.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); void open(entry);
    });
  });
  closeButton.addEventListener('click', () => { void close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    // Keep both ends predictable in embedded browsers that otherwise send
    // backward Tab from the first control to their surrounding browser chrome.
    const last = dialog.querySelector('.friends-list li:last-child a') || dialog.querySelector('.friends-scroll');
    if (event.shiftKey && document.activeElement === closeButton) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); closeButton.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  dialog.addEventListener('pointerdown', event => { outsidePress = event.target === dialog; });
  dialog.addEventListener('click', event => { if (outsidePress && event.target === dialog) void close(); outsidePress = false; });
  dialog.addEventListener('close', () => {
    ++revision; animation?.cancel(); animation = null;
    delete document.body.dataset.friendsOpen;
    dialog.dataset.state = 'closed';
    entries.forEach(entry => entry.setAttribute('aria-expanded', 'false'));
    document.dispatchEvent(new CustomEvent('starry:friends', { detail: { open: false } }));
    (trigger?.hidden ? document.getElementById('home') : trigger)?.focus({ preventScroll: true });
  });
  preference.addEventListener('change', () => { if (preference.matches) animation?.finish(); });
}
