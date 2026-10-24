const preference = matchMedia('(prefers-reduced-motion: reduce)');
const softMotion = () => preference.matches || document.body.dataset.motion === 'soft' ||
  new URLSearchParams(location.search).get('motion') === 'soft' || document.body.dataset.defaultMotion === 'soft';
const ease = 'cubic-bezier(.2,.75,.25,1)';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function motion(element, frames, duration, animations) {
  const animation = element.animate(frames, { duration, easing: ease, fill: 'both' });
  animations.add(animation);
  return animation.finished.catch(() => {}).finally(() => {
    animations.delete(animation);
    animation.cancel();
  });
}

function cancelAnimations(animations, freeze = false) {
  for (const animation of animations) {
    if (freeze) {
      try { animation.commitStyles(); } catch { /* An already detached node needs no frozen frame. */ }
    }
    animation.cancel();
  }
  animations.clear();
}

function createMonthBrowser(sheet, standalone = false) {
  const months = [...sheet.querySelectorAll('[data-month]')];
  if (!months.length) return { settle() {} };
  const scroller = sheet.querySelector('[data-journal-scroll]');
  const archive = sheet.querySelector('.journal-archive');
  const older = sheet.querySelector('[data-journal-older]');
  const newer = sheet.querySelector('[data-journal-newer]');
  const container = sheet.querySelector('[data-journal-months]');
  const animations = new Set();
  const savedScroll = new Map();
  let current = 0, requested = 0, revision = 0;
  sheet.classList.add('journal-enhanced');
  older.hidden = newer.hidden = false;

  function scrollPosition() { return standalone ? window.scrollY : scroller.scrollTop; }
  function scrollTo(top) {
    if (standalone) window.scrollTo({ top, behavior: 'instant' });
    else scroller.scrollTo({ top, behavior: 'instant' });
  }
  function select(index) {
    current = index;
    months.forEach((month, i) => { month.hidden = i !== index; });
    sheet.querySelector('[data-journal-year]').textContent = months[index].dataset.year;
    sheet.querySelector('[data-journal-month-label]').textContent = months[index].dataset.name;
    sheet.querySelectorAll('[data-journal-month]').forEach(link => {
      if (link.dataset.journalMonth === months[index].dataset.month) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    older.disabled = index === months.length - 1;
    newer.disabled = index === 0;
  }
  function settle() {
    revision++;
    cancelAnimations(animations);
    container.removeAttribute('aria-busy');
    select(requested);
  }
  async function change(index) {
    index = clamp(index, 0, months.length - 1);
    if (index === requested) { archive.open = false; return; }
    const ticket = ++revision;
    requested = index;
    const direction = index > current ? -1 : 1;
    archive.open = false;
    savedScroll.set(current, scrollPosition());
    cancelAnimations(animations);
    container.setAttribute('aria-busy', 'true');
    if (!softMotion()) await motion(months[current], [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${direction * 9}px)` }], 105, animations);
    if (ticket !== revision) return;
    select(index);
    scrollTo(savedScroll.get(index) || 0);
    await motion(months[index], softMotion()
      ? [{ opacity: .65 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translateX(${-direction * 12}px)` }, { opacity: 1, transform: 'none' }], softMotion() ? 100 : 205, animations);
    if (ticket !== revision) return;
    container.removeAttribute('aria-busy');
    sheet.querySelector('[data-journal-status]').textContent = `已翻到 ${months[index].dataset.year} 年${months[index].dataset.name}`;
  }
  sheet.addEventListener('click', event => {
    const monthLink = event.target.closest('[data-journal-month]');
    if (monthLink) {
      event.preventDefault();
      void change(months.findIndex(month => month.dataset.month === monthLink.dataset.journalMonth));
    } else if (event.target.closest('[data-journal-older]')) void change(requested + 1);
    else if (event.target.closest('[data-journal-newer]')) void change(requested - 1);
  });
  sheet.addEventListener('keydown', event => {
    if (event.key === 'Escape' && archive.open) {
      event.preventDefault(); event.stopPropagation();
      archive.open = false;
      archive.querySelector('summary').focus({ preventScroll: true });
    }
  });
  document.addEventListener('pointerdown', event => {
    if (archive.open && !archive.contains(event.target)) archive.open = false;
  });
  function revealHash() {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (!target || !sheet.contains(target)) return;
    const month = target.closest('[data-month]');
    const index = months.indexOf(month);
    if (index < 0) return;
    requested = index;
    settle();
    requestAnimationFrame(() => {
      if (standalone) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
    });
  }
  select(0);
  if (standalone) {
    revealHash();
    window.addEventListener('hashchange', revealHash);
  }
  return { settle };
}

const standalone = document.querySelector('.journal-standalone [data-journal-surface]');
if (standalone) createMonthBrowser(standalone, true);

const dialog = document.getElementById('window-journal');
if (dialog) {
  const sheet = dialog.querySelector('[data-journal-surface]');
  const animations = new Set();
  let trigger = null, revision = 0, loaded = false, loadPromise = null, browser = null;
  let offset = { x: -30, y: 36 };

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch(dialog.dataset.journalUrl, { credentials: 'same-origin', cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`Journal request failed: ${response.status}`);
        return response.text();
      }).then(html => {
        const page = new DOMParser().parseFromString(html, 'text/html');
        const content = page.querySelector('.journal-standalone [data-journal-surface]');
        if (!content) throw new Error('Journal page is missing its reading sheet.');
        return content;
      }).catch(error => { loadPromise = null; throw error; });
    return loadPromise;
  }

  async function fill(ticket) {
    if (loaded) return;
    try {
      const content = await load();
      if (ticket !== revision || !dialog.open || dialog.dataset.state === 'closing') return;
      const focusClose = sheet.querySelector('.journal-close') === document.activeElement;
      // Preserve the animated sheet itself; only replace its contents as they arrive.
      sheet.innerHTML = content.innerHTML;
      const closeLink = sheet.querySelector('.journal-close');
      const closeButton = document.createElement('button');
      closeButton.type = 'button'; closeButton.className = 'journal-close';
      closeButton.dataset.journalClose = '';
      closeButton.setAttribute('aria-label', '合上手记');
      closeButton.innerHTML = '<span>合上手记</span><span class="journal-close-mark" aria-hidden="true">×</span>';
      closeLink.replaceWith(closeButton);
      browser = createMonthBrowser(sheet);
      loaded = true;
      if (focusClose) closeButton.focus({ preventScroll: true });
    } catch (error) {
      if (ticket !== revision || !dialog.open || dialog.dataset.state === 'closing') return;
      const area = sheet.querySelector('[data-journal-scroll]');
      area.replaceChildren();
      const message = document.createElement('div'); message.className = 'journal-loading'; message.setAttribute('role', 'status');
      const text = document.createElement('p'); text.textContent = '手记暂时没能翻开。';
      const retry = document.createElement('button'); retry.type = 'button'; retry.dataset.journalRetry = ''; retry.textContent = '再试一次';
      const link = document.createElement('a'); link.href = dialog.dataset.journalUrl; link.textContent = '直接阅读手记';
      message.append(text, retry, link); area.append(message);
      console.warn('Could not open the journal.', error);
    }
  }

  async function open(source) {
    if (dialog.open) return;
    trigger = source;
    const ticket = ++revision;
    cancelAnimations(animations);
    sheet.style.transform = ''; sheet.style.opacity = '';
    dialog.dataset.state = 'opening';
    document.body.dataset.journalOpen = 'true';
    dialog.showModal();
    sheet.querySelector('[data-journal-close]').focus({ preventScroll: true });
    const rect = dialog.getBoundingClientRect(), origin = source.getBoundingClientRect();
    offset = { x: clamp((origin.left + origin.width / 2 - rect.left - rect.width / 2) * .14, -55, 55), y: clamp((origin.top + origin.height / 2 - rect.top - rect.height / 2) * .14, -40, 55) };
    sheet.style.transformOrigin = `${clamp((origin.left + origin.width / 2 - rect.left) / rect.width * 100, 5, 95)}% ${clamp((origin.top + origin.height / 2 - rect.top) / rect.height * 100, 5, 95)}%`;
    document.dispatchEvent(new CustomEvent('starry:journal', { detail: { open: true } }));
    void fill(ticket);
    await motion(sheet, softMotion()
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translate(${offset.x}px,${offset.y}px) scale(.93) rotate(-.65deg)` }, { opacity: 1, transform: 'none' }], softMotion() ? 140 : 600, animations);
    if (ticket === revision && dialog.open) dialog.dataset.state = 'open';
  }

  async function close() {
    if (!dialog.open || dialog.dataset.state === 'closing') return;
    const ticket = ++revision;
    browser?.settle();
    cancelAnimations(animations, true);
    const current = getComputedStyle(sheet);
    const from = { opacity: current.opacity, transform: current.transform };
    dialog.dataset.state = 'closing';
    await motion(sheet, [from, softMotion()
      ? { opacity: 0, transform: 'none' }
      : { opacity: 0, transform: `translate(${offset.x * .7}px,${offset.y * .7}px) scale(.965) rotate(-.35deg)` }], softMotion() ? 140 : 320, animations);
    if (ticket !== revision) return;
    dialog.close();
    delete document.body.dataset.journalOpen;
    dialog.dataset.state = 'closed';
    sheet.style.transform = ''; sheet.style.opacity = '';
    document.dispatchEvent(new CustomEvent('starry:journal', { detail: { open: false } }));
    const visible = trigger && getComputedStyle(trigger).visibility !== 'hidden' && trigger.getBoundingClientRect().right > 0;
    const fallback = document.getElementById('room-journal-shortcut');
    (visible ? trigger : fallback)?.focus({ preventScroll: true });
  }

  document.querySelectorAll('[data-journal-open]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); void open(link);
    });
    for (const name of ['pointerenter', 'focus']) link.addEventListener(name, () => { void load().catch(() => {}); }, { once: true });
  });
  sheet.addEventListener('click', event => {
    if (event.target.closest('[data-journal-close]')) void close();
    if (event.target.closest('[data-journal-retry]')) {
      sheet.querySelector('[data-journal-scroll]').innerHTML = '<div class="journal-loading" role="status">正在翻开手记…</div>';
      void fill(revision);
    }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  let outsidePress = false;
  dialog.addEventListener('pointerdown', event => { outsidePress = event.target === dialog; });
  dialog.addEventListener('click', event => { if (outsidePress && event.target === dialog) void close(); outsidePress = false; });
  preference.addEventListener('change', () => {
    browser?.settle();
    // Complete a running transition at its endpoint when the user asks for less motion.
    if (preference.matches) for (const animation of animations) animation.finish();
  });

  function updateBookVisibility() {
    const book = document.getElementById('room-journal');
    if (!book || document.body.dataset.room !== 'inside') return;
    const rect = book.getBoundingClientRect();
    document.body.dataset.bookVisible = String(rect.left >= 12 && rect.right <= innerWidth - 12 && rect.top >= 12 && rect.bottom <= innerHeight - 12);
  }
  window.addEventListener('resize', updateBookVisibility);
  const roomObserver = new MutationObserver(updateBookVisibility);
  roomObserver.observe(document.body, { attributes: true, attributeFilter: ['data-room'] });
  updateBookVisibility();
}
