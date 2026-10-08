# Hexo Blog Development Instructions

## Project Overview

This repository contains one Hexo content source, two local themes, and a preserved design prototype. New-theme code is on `codex/starfield-personal`; `master` currently retains the legacy blog.

- **Framework**: Hexo `8.1.2` as resolved by the root npm lockfile.
- **Runtime**: Node.js `22.19.0` (`.nvmrc`), npm `10.9.3`; install with `npm ci`.
- **Default theme**: customized `themes/hexo-theme-kira/`, selected by `_config.yml`.
- **New theme**: `themes/stargazer-starfield/`, serving real articles through an independent Hexo theme and browser scene.
- **Design prototype**: `themes/hexo-theme-kira/prototypes/starfield/`, using mock articles and development tools. It is outside the theme's publish assets.
- **Templates/content**: EJS and Markdown; legacy styling uses Stylus, new-theme styling uses CSS and native JavaScript modules.

Read [README.md](../README.md) for entry points, [the new-theme guide](../docs/operations/starfield-blog.md) for writing/building, and [the legacy guide](../docs/operations/legacy-blog-recovery.md) for Kira recovery. Follow [AGENTS.md](../AGENTS.md) for documentation lookup and design decisions.

## Content and Configuration

- `source/_posts/`, `source/pages/`, and `source/image/` are shared by both themes.
- `prepare-starfield.cjs` saves stable IDs, original permalinks, descriptions and new star positions. Preview may update post Front-matter and `source/_data/starry-layout.json`; commit these together with content.
- Article `related` entries reference unique post filenames without `.md`, not display titles. One declaration creates a bidirectional pair; reasons are optional. Title edits preserve identity, original URL and saved position; filename edits require updating references.
- `_config.hexo-theme-kira.yml` retains Kira settings and the shared friends list. Friends pages use `source/pages/friends/index.md` with `layout: friends`.
- `_config.stargazer-preview.yml` and `_config.stargazer.yml` select the new theme without changing the default. `_config.legacy-preview.yml` explicitly selects Kira for isolated preview.
- `themes/stargazer-starfield/_config.yml` configures scene assets and the featured article; `assets/` holds source UI artwork used by the new theme's asset generator.

## Development and Validation

- Create posts with `npx hexo new post "Post Title"` after dependency installation.
- Run `npm run start:starfield` for real-content preview on port 4175. It prepares, generates, then serves `.preview/stargazer/`.
- With the service running, regenerate using `npm run preview:starfield`, then refresh. Static preview does not watch files or open a browser automatically.
- `prepare:starfield` aliases the full preview preparation/generation; `generate:starfield` only generates already-prepared data.
- Run `npm run preview:legacy`, then `npm run serve:legacy` for `.preview/legacy/` on port 4176. `npm run server` is Kira's watching Hexo development server on port 4000.
- `npm run prototype:stars` serves the mock V20 prototype on port 4173; the frozen V19 server uses port 4174. Prototype version query parameters label a study rather than loading historical source.
- Run Hexo preparation/generation sequentially: both themes share `db.json`. Separate static preview servers may run together.
- `npm run build:starfield` builds the new theme into `public/` from saved metadata. `npm run netlify` cleans/builds Kira into the same directory; a later production build replaces the earlier output.
- Use existing `npm test` checks when changes affect content preparation, generated output or covered behavior. Match additional validation to the actual change.

## Production and Design Status

`netlify.toml` defaults to Kira (`npm run netlify`, `public/`); its Deploy Preview context uses `npm run build:starfield`. Neither a local preview nor a successful static build proves a hosted deployment. Confirm remote project settings and actual deployment results before reporting an online theme switch.

The new theme already consumes real articles and retains old article and collection routes, friends and music content, plus readable static fallbacks. Current visuals include the observation panel and blue retro reader. Design authority and evidence are linked from [the design document](../docs/design/starry-blog.md): the 2026-10-01 personal-site plan and subsequent explicit updates supersede older public-template requirements. Dated studies, old ticket states and execution prompts retain their historical meaning.

Edit local theme files under `themes/`. Keep content/style changes scoped to the intended theme; preserve shared content and existing stable article metadata. Media paths use `/image/filename.ext`; custom pages live at `source/pages/<page-name>/index.md` and select an available `layout` in Front-matter.
