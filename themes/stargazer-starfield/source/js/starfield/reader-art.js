// Decode the reading artwork while the user approaches an article.
// Loading CSS backgrounds for the first time during the reveal can block a
// compositor commit for more than 150ms. Preparation stays in the background;
// readable text never waits for decorative requests or font downloads.
import { prepareImages } from './image-readiness.js';
import { uiCodepoints } from './font-coverage.js';
let images = null, pending = null, pendingTitle = '';

function prepareTitle(text) {
  if (!document.fonts) return [];
  const uncovered = [...text].filter(character => !uiCodepoints.has(character.codePointAt(0))).join('');
  return [document.fonts.load('16px "LXGW Marker Gothic UI"', text || ' '),
    ...(uncovered ? [document.fonts.load('16px "LXGW Marker Gothic"', uncovered)] : [])];
}

export function prepareReaderArt(title = '', priority = 'low') {
  if (priority === 'high') images?.forEach(image => { image.fetchPriority = 'high'; });
  if (pending && title === pendingTitle) return pending;
  const fonts = prepareTitle(title);
  if (pending) return Promise.allSettled([pending, ...fonts]).then(() => {});
  pendingTitle = title;
  images ||= ['sheet', 'continuation', 'progress-track'].map(name => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = priority;
    const key = { sheet: 'readerSheet', continuation: 'readerContinuation', 'progress-track': 'readerTrack' }[name];
    image.src = document.body?.dataset[key] || new URL(`../../images/reader/${name}.webp`, import.meta.url).href;
    return image;
  });
  pending = Promise.allSettled([
    prepareImages(document.getElementById?.('reader')),
    ...images.map(image => image.decode()),
    ...fonts,
  ]).then(() => {}).finally(() => { pending = null; });
  return pending;
}
