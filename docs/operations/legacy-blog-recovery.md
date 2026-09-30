# Legacy blog recovery

This procedure reconstructs the current Kira blog from the repository, its npm lockfile, and the pinned Node runtime. It does not switch or deploy the production site.

## Baseline and package tool

- The preserved working-tree snapshot and hashes are in [the 2026-09-30 manifest](../../.scratch/starry-blog/baseline-worktree-manifest-20260930.json); the initial `git status` is in the adjacent text file. Saved copies of the legacy site config, package metadata/lock, Netlify config, runtime pin, and ignore rules are in [legacy-2026-09-30](../../.scratch/starry-blog/baselines/legacy-2026-09-30/manifest.json).
- The old site source and local Kira customization remain under `source/` and `themes/hexo-theme-kira/`.
- Use Node `22.19.0` from `.nvmrc`, npm `10.9.3`, and `package-lock.json` with `npm ci`. This is the validated legacy build baseline. The root npm lockfile is v3 and resolves Hexo `8.1.2` and `moment-timezone` `0.6.2`. The former pnpm v9 lockfile is preserved byte-for-byte at `.scratch/starry-blog/baselines/pnpm-lock.yaml`; it resolved Hexo `8.0.0` and `moment-timezone` `0.6.0`. Netlify automatically selects pnpm when `pnpm-lock.yaml` is in the site base, so the archived copy is outside the site base and the root now has only the npm lockfile. Other direct dependency versions match between the two historical lockfiles.

## Rebuild and serve the legacy site

From the repository root, in a clean checkout or an isolated copy:

```powershell
npm ci
npm run netlify
npm run server -- --port 4000
```

The current `_config.yml` selects `hexo-theme-kira`; `_config.hexo-theme-kira.yml` supplies the local Kira settings. The existing deployment build remains `npm run netlify` and publishes `public/`.

## Keep previews separate

- Legacy Hexo output: `public/`; the Netlify configuration publishes this directory.
- Current V20 mock prototype: `node themes/hexo-theme-kira/prototypes/starfield/server.mjs`, served locally at `http://127.0.0.1:4173/pages/starfield-prototype/`. The server reads only prototype files and refuses `NODE_ENV=production`.
- Frozen V19 prototype evidence: `node .scratch/starry-blog/baseline-server.mjs`, served at port `4174`.
- Formal theme work: `themes/stargazer-starfield/`; its isolated preview output is reserved under `.preview/` and is ignored by Git. No formal theme preview exists yet; later work must not use or replace `public/` for that preview.

## Netlify facts and limits

The repository's `netlify.toml` sets `npm run netlify` and `public/`. With no pnpm/yarn/bun lockfile in the site base, Netlify's documented default installer is npm; `.nvmrc` pins the repository build to Node `22.19.0`. The file adds one-week caching with stale-while-revalidate for `/image/*`, `/lib/*`, `/deps/*`, `/css/*`, and `/js/*`. The CLI is not installed in this workspace and there is no `.netlify/state.json`, so the connected site's production branch, UI overrides (including any custom install command or Node selection), selected build image, deploy-context settings, deploy history, and deploy URL are not available locally. Those values must be read from the actual Netlify project during ticket 15. No production deployment is performed by this recovery procedure.

## Recovery demonstration

The ticket 02 evidence records the exact clean-install command, successful old-site build, requested legacy routes, and local HTTP response. To restore the old layout after a future theme switch, restore these saved files from the baseline archive:

```powershell
$legacy = '.scratch/starry-blog/baselines/legacy-2026-09-30'
Copy-Item "$legacy/_config.yml" '_config.yml' -Force
Copy-Item "$legacy/_config.hexo-theme-kira.yml" '_config.hexo-theme-kira.yml' -Force
Copy-Item "$legacy/package.json" 'package.json' -Force
Copy-Item "$legacy/package-lock.json" 'package-lock.json' -Force
Copy-Item "$legacy/netlify.toml" 'netlify.toml' -Force
Copy-Item "$legacy/.nvmrc" '.nvmrc' -Force
npm ci
npm run netlify
npm run server -- --static --port 4000
```

Kira's local theme code and the existing articles/media are preserved in the repository's baseline commit. In an isolated copy we switched `_config.yml` to the Landscape theme, built it, copied the saved Kira configs back, and rebuilt: 103 files were generated and the real `/2025/10/20/梦开始的地方[置顶]/` article returned HTTP 200 and displayed in the browser. The user's repository `public/` was never used or changed.

## Official documentation checked

Context7 resolve/query tools were not available in this session (no matching tool was present in the callable tool list). I checked primary documentation instead: [Hexo requirements](https://hexo.io/docs/) (Hexo 8 requires Node 20.19.0 or newer), [Hexo static server mode](https://hexo.io/docs/server), [npm `ci`](https://docs.npmjs.com/cli/v10/commands/npm-ci), [Netlify dependency selection and Node versions](https://docs.netlify.com/build/configure-builds/manage-dependencies/), and [Netlify file-based build configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/).
