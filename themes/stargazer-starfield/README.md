# Stargazer Starfield theme

This is the formal Hexo theme, separate from the legacy Kira theme and its mock prototype at `themes/hexo-theme-kira/prototypes/starfield/`.

The default site and Netlify build remain on Kira. After adding or changing a post, run `npm run prepare:starfield` to save stable article IDs, original permalinks, plain-text excerpts, and star positions, then generate the isolated preview. The command never changes an existing ID or saved position. You can rebuild from committed data with `npm run preview:starfield`, then serve it with `npm run serve:starfield` at `http://127.0.0.1:4175/`. The formal theme writes only to the ignored `.preview/stargazer/` directory; production continues to publish `public/`.

Set `starry_excerpt` in Front-matter to write a manual introduction. Generated introductions are tagged with `starry_excerpt_generated: true` and refresh from the article body on the next preparation run. To replace one with a manual introduction, edit `starry_excerpt` and remove that generated marker.

The prepared index contains every published Hexo post. IDs and first permalinks are stored with each post; versioned positions live in `source/_data/starry-layout.json`. General-purpose scene configuration and release readiness are handled by later tickets.

## Article relationships

Edit `source/_data/starry-relations.yml` to maintain semantic relationships separately from the stars' spatial proximity. Each adopted entry names exactly two stable `starry_id` values, so the relationship works from either article and never depends on filenames or list order. The IDs below are placeholders; replace them with IDs from article front matter:

```yaml
version: 1
adopted:
  - articles: [dream-begins, article-your-other-post-id]
    reason: "An optional author-written reason."
candidates:
  - articles: [dream-begins, article-another-post-id]
    reason: "An unreviewed suggestion."
```

Only `adopted` is included in the generated visitor index. Candidate suggestions are ignored by the publisher until an author deliberately moves one to `adopted`; they never block publishing. `reason` is optional plain text. Missing or unpublished IDs are skipped with a build warning that names the source file and entry. Adding a relationship does not alter saved star positions. A star's nearby route remains a spatial way to explore; only adopted relationships get the separately styled semantic guide, and a reason appears in reading after the current article is fully visible or reaches its end.
