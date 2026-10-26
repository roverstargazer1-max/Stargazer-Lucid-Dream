// Keep request-bearing image markup inert in the generated HTML, including srcset
// and picture sources. Hiding an ordinary img would still allow an early request.
function deferJournalImages($, scope) {
  $('img').each((index, element) => {
    const image = $(element);
    for (let parent = element.parent; parent; parent = parent.parent) {
      if (parent.name === 'template') return;
    }
    let media = image.closest('picture');
    if (!media.length) media = image;
    const link = media.parent('a');
    if (link.length && link.contents().toArray().every(node => node === media[0] || (node.type === 'text' && !node.data.trim()))) media = link;
    const id = `journal-image-${scope}-${index}`;
    const wrapper = $('<span class="journal-image" data-journal-image></span>');
    const button = $(`<button class="journal-image-toggle" type="button" data-journal-image-toggle aria-expanded="false" aria-controls="${id}" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><circle cx="8" cy="9" r="1.3"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg><span data-journal-image-label>查看图片</span></button>`);
    if (image.attr('alt')) button.attr('aria-label', `查看图片：${image.attr('alt')}`);
    // Parse the template with its contents together: parse5 stores template
    // children in a separate fragment when serializing the finished document.
    const panel = $(`<span class="journal-image-panel" id="${id}" data-journal-image-panel hidden><span class="journal-image-feedback" data-journal-image-feedback role="status"></span><template>${media.toString()}</template></span>`);
    media.replaceWith(wrapper);
    for (const adjacent of [wrapper[0].prev, wrapper[0].next]) {
      if (adjacent?.name === 'br') $(adjacent).remove();
    }
    wrapper.append(button, panel);
    const source = image.attr('src');
    if (source) {
      const fallback = $('<a class="journal-image-fallback">查看图片</a>').attr('href', source);
      wrapper.append($('<noscript></noscript>').append(fallback));
    }
  });
}

module.exports = { deferJournalImages };
