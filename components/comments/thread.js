// Waline supplies rendered markup. Only detached template text reaches either UI.
function commentText(markup) {
  const template = document.createElement('template');
  template.innerHTML = String(markup || '');
  for (const node of template.content.querySelectorAll('script, style')) node.remove();
  for (const node of template.content.querySelectorAll('br, p')) node.append('\n');
  return template.content.textContent.trim();
}

async function request(api, query, options = {}) {
  const url = new URL(api, location.href);
  url.search = new URLSearchParams({ lang: 'zh-CN', ...query }).toString();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => controller.abort(new DOMException('评论请求超时', 'TimeoutError')), 10000);
  try {
    const response = await fetch(url, { cache: 'no-store', credentials: 'omit', ...options, signal: controller.signal });
    const result = await response.json();
    if (!response.ok || result.errno) throw new Error(result.errmsg || '评论服务暂时不可用。');
    return result.data;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

// A small recent feed is one request. For a larger site, also draw a page
// from a random article so older comments stay discoverable without a full crawl.
export async function meteorComments(api, articles, signal) {
  const rows = await request(api, { type: 'recent', count: 50 }, { signal });
  if (rows.length >= 50 && articles.length) {
    const article = articles[Math.floor(Math.random() * articles.length)];
    const query = { path: article.id, pageSize: 20, sortBy: 'insertedAt_desc' };
    let sample = await request(api, { ...query, page: 1 }, { signal });
    const page = 1 + Math.floor(Math.random() * sample.totalPages);
    if (page > 1) sample = await request(api, { ...query, page }, { signal });
    for (const row of sample.data) rows.push(row, ...(row.children || []));
  }
  return [...new Map(rows.map(row => [String(row.objectId), {
    id: String(row.objectId), articleId: row.url, excerpt: commentText(row.comment),
  }])).values()].filter(row => row.excerpt);
}

export function mountComments(section, api, anchor = '') {
  const articleId = section.closest('[data-starry-id]').dataset.starryId;
  const form = section.querySelector('form');
  const submit = form.querySelector('button');
  const status = section.querySelector('[data-comment-status]');
  const total = section.querySelector('[data-comment-total]');
  const list = section.querySelector('ol');
  const listStatus = section.querySelector('.comment-list-status');
  const more = section.querySelector('[data-comment-more]');
  const controller = new AbortController();
  const { signal } = controller;
  let page = 0;
  let loading = false;
  let retryFirstPage = false;
  let pendingAnchor = anchor;
  let observer;
  const displayed = new Set();

  function reveal(element) {
    element.scrollIntoView({ block: 'center' });
    element.focus({ preventScroll: true });
  }

  function append(row) {
    const id = String(row.objectId);
    if (displayed.has(id)) return;
    displayed.add(id);
    const item = document.createElement('li');
    item.id = 'comment-' + id;
    item.tabIndex = -1;
    const byline = document.createElement('header');
    const name = document.createElement('strong');
    name.textContent = row.nick;
    const date = document.createElement('time');
    const timestamp = new Date(row.insertedAt);
    if (Number.isFinite(timestamp.getTime())) {
      date.dateTime = timestamp.toISOString();
      date.textContent = timestamp.toLocaleDateString('zh-CN');
    }
    byline.append(name, date);
    const message = document.createElement('p');
    message.textContent = commentText(row.comment);
    item.append(byline, message);
    list.append(item);
  }

  async function load(reset = false) {
    if (loading || signal.aborted) return;
    loading = true;
    more.disabled = true;
    submit.disabled = true;
    listStatus.textContent = '正在读取评论…';
    try {
      let next = reset || retryFirstPage ? 1 : page + 1;
      retryFirstPage = next === 1;
      let hasMore;
      do {
        const data = await request(api, { path: articleId, page: next, pageSize: 20, sortBy: 'insertedAt_desc' }, { signal });
        if (signal.aborted) return;
        if (next === 1) {
          list.replaceChildren();
          displayed.clear();
          total.hidden = !Number.isInteger(data.count);
          total.textContent = total.hidden ? '' : data.count + ' 条';
        }
        for (const row of data.data) {
          append(row);
          for (const child of row.children || []) append(child);
        }
        page = next++;
        retryFirstPage = false;
        hasMore = page < data.totalPages;
      } while (hasMore && pendingAnchor && !document.getElementById(pendingAnchor));
      more.textContent = '查看更多';
      more.hidden = !hasMore;
      listStatus.textContent = displayed.size ? '' : '还没有评论。';
      if (pendingAnchor) {
        const target = document.getElementById(pendingAnchor);
        if (target && list.contains(target)) reveal(target);
        else { listStatus.textContent = '这条评论已不可见。'; reveal(section); }
        pendingAnchor = '';
      }
    } catch {
      if (signal.aborted) return;
      listStatus.textContent = '评论暂时无法加载。';
      more.textContent = '重试';
      more.hidden = false;
    } finally {
      if (!signal.aborted) {
        loading = false;
        more.disabled = false;
        submit.disabled = form.dataset.sending === 'true';
      }
    }
  }

  list.replaceChildren();
  total.hidden = true;
  status.textContent = '';
  listStatus.textContent = '';
  more.hidden = true;
  submit.disabled = !api;
  delete form.dataset.sending;
  if (anchor) section.scrollIntoView({ block: 'start' });
  if (anchor === 'article-comments') {
    pendingAnchor = '';
    (api ? form.elements.nick : section).focus({ preventScroll: true });
  }
  if (!api) {
    form.elements.nick.disabled = true;
    form.elements.comment.disabled = true;
    status.textContent = '评论服务尚未开放。';
    return () => {};
  }
  more.addEventListener('click', () => load(), { signal });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.sending === 'true' || loading) return;
    const nick = form.elements.nick.value.trim();
    const comment = form.elements.comment.value.trim();
    if (!nick || !comment) {
      status.textContent = '请填写昵称和留言。';
      (nick ? form.elements.comment : form.elements.nick).focus();
      return;
    }
    observer?.disconnect();
    form.dataset.sending = 'true';
    submit.disabled = true;
    more.disabled = true;
    status.textContent = '正在发表…';
    try {
      const saved = await request(api, {}, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, comment, url: articleId }),
      });
      if (signal.aborted) return;
      if (form.elements.comment.value.trim() === comment) form.elements.comment.value = '';
      const pending = saved?.status && saved.status !== 'approved';
      status.textContent = pending ? '留言已提交，等待审核。' : '留言已提交。';
      document.dispatchEvent(new Event('starry:comments-changed'));
      await load(true);
    } catch (err) {
      if (!signal.aborted) status.textContent = err.name === 'TimeoutError'
        ? '提交结果暂未确认，请刷新查看。' : err.message || '发表失败，请重试。';
    } finally {
      if (!signal.aborted) { delete form.dataset.sending; submit.disabled = false; more.disabled = false; }
    }
  }, { signal });
  if (anchor || !window.IntersectionObserver) void load();
  else {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: '120px' });
    observer.observe(section);
  }
  return () => { observer?.disconnect(); controller.abort(); };
}

const legacy = document.querySelector('[data-kira-comments]');
if (legacy) mountComments(legacy.querySelector('.article-comments'), legacy.dataset.api, location.hash.slice(1));
