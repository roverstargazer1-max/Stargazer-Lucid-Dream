// Decode the unchanged reading artwork while the user approaches an article.
// Loading CSS backgrounds for the first time during the reveal can block a
// compositor commit for more than 150ms. Preparation never gates readable text.
let images = null, pending = null;

export function prepareReaderArt() {
  if (pending) return pending;
  images ||= ['sheet', 'continuation', 'progress-track'].map(name => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.src = new URL(`../../images/reader/${name}.webp`, import.meta.url).href;
    return image;
  });
  pending = Promise.allSettled([
    ...images.map(image => image.decode()),
    document.fonts?.load('16px "LXGW Marker Gothic"'),
  ]).then(() => {}).finally(() => { pending = null; });
  return pending;
}
