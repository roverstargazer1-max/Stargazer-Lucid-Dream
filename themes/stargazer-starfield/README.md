# Stargazer Starfield theme

This is the formal Hexo theme, separate from the legacy Kira theme and its mock prototype at `themes/hexo-theme-kira/prototypes/starfield/`.

The default site and Netlify build remain on Kira. After adding or changing a post, run `npm run prepare:starfield` to save stable article IDs, original permalinks, plain-text excerpts, and star positions, then generate the isolated preview. The command never changes an existing ID or saved position. You can rebuild from committed data with `npm run preview:starfield`, then serve it with `npm run serve:starfield` at `http://127.0.0.1:4175/`. The formal theme writes only to the ignored `.preview/stargazer/` directory; production continues to publish `public/`.

Set `starry_excerpt` in Front-matter to write a manual introduction. Generated introductions are tagged with `starry_excerpt_generated: true` and refresh from the article body on the next preparation run. To replace one with a manual introduction, edit `starry_excerpt` and remove that generated marker.

The prepared index contains every published Hexo post. IDs and first permalinks are stored with each post; versioned positions live in `source/_data/starry-layout.json`. More content relationships, general-purpose scene configuration, and release readiness are handled by later tickets.
