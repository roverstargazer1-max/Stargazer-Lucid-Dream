function articleTimeOrder(post) {
  return `${post.date.format('YYYY-MM-DDTHH:mm:ss')}|${post.starry_id}`;
}

function adjacentArticles(posts, articleId) {
  const ordered = posts.filter(post => post.published !== false && post.starry_id)
    .map(post => ({ post, order: articleTimeOrder(post) }))
    .sort((left, right) => left.order < right.order ? -1 : left.order > right.order ? 1 : 0);
  const index = ordered.findIndex(item => item.post.starry_id === articleId);
  return {
    previous: index > 0 ? ordered[index - 1].post : null,
    next: index >= 0 ? ordered[index + 1]?.post || null : null,
  };
}

module.exports = { articleTimeOrder, adjacentArticles };
