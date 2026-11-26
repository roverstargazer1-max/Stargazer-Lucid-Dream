const preference = 'starfield.readerZoomPercent';

export function setupReaderZoom(reader, scroller) {
  const slider = reader.querySelector('#reader-zoom');
  const value = reader.querySelector('#reader-zoom-value');
  const toggle = reader.querySelector('#reader-zoom-toggle');
  const panel = reader.querySelector('#reader-zoom-panel');
  const defaultZoom = matchMedia('(pointer: coarse)').matches ? Number(slider.defaultValue) : 70;

  function apply() {
    reader.style.setProperty('--reader-scale', slider.valueAsNumber / 100);
    value.textContent = slider.value + '%';
    slider.setAttribute('aria-valuetext', value.textContent);
  }

  slider.valueAsNumber = defaultZoom;
  try {
    const saved = Number(localStorage.getItem(preference));
    if (Number.isInteger(saved) && saved >= Number(slider.min) && saved <= Number(slider.max)) {
      slider.valueAsNumber = saved;
    }
  } catch { /* Preferences are optional when browser storage is unavailable. */ }
  apply();

  function changeZoom() {
    const viewport = scroller.getBoundingClientRect();
    const x = viewport.left + viewport.width / 2;
    const y = viewport.top + viewport.height / 2;
    const anchor = document.elementsFromPoint(x, y).find(node => node !== scroller && scroller.contains(node));
    const before = anchor?.getBoundingClientRect();
    const fraction = before?.height ? (y - before.top) / before.height : 0;
    const atTop = scroller.scrollTop <= 1;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    apply();
    if (atTop) scroller.scrollTop = 0;
    else if (atEnd) scroller.scrollTop = scroller.scrollHeight;
    else if (anchor) {
      // Pin the same part of the paragraph or image as its lines reflow.
      const after = anchor.getBoundingClientRect();
      const bounds = scroller.getBoundingClientRect();
      scroller.scrollTop += after.top + fraction * after.height - (bounds.top + bounds.height / 2);
    }
  }

  function save() {
    try { localStorage.setItem(preference, slider.value); } catch { /* Zoom still works for this visit. */ }
  }
  slider.addEventListener('input', changeZoom);
  slider.addEventListener('change', save);
  reader.querySelector('#reader-zoom-reset').addEventListener('click', () => {
    slider.valueAsNumber = defaultZoom;
    changeZoom();
    save();
  });

  function placePanel() {
    // Keep the slider stationary during a drag, even as the book edges move.
    const button = toggle.getBoundingClientRect();
    panel.style.setProperty('--zoom-panel-right', innerWidth - button.right + 'px');
    panel.style.setProperty('--zoom-panel-top', button.bottom + 2 + 'px');
  }
  panel.addEventListener('beforetoggle', event => {
    if (event.newState === 'open') placePanel();
  });
  window.addEventListener('resize', () => {
    if (panel.matches(':popover-open')) placePanel();
  });
}
