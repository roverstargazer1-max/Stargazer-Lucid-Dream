// Bound both the response headers and body so an optional reading surface can
// always offer a retry, even when the browser's network timeout is much longer.
export function requestText(url, { request = fetch, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  let timer;
  const work = (async () => {
    const response = await request(url, { credentials: 'same-origin', signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.text();
  })();
  const deadline = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error('The content request timed out.');
      error.name = 'TimeoutError';
      reject(error);
      controller.abort();
    }, timeoutMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}
