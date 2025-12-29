# Hexo Blog Development Instructions

## Project Overview
This is a static blog built with [Hexo](https://hexo.io/) using the [hexo-theme-kira](https://github.com/ch1ny/hexo-theme-kira) theme.
- **Framework**: Hexo 8.0.0
- **Theme**: Custom local version of `hexo-theme-kira` located in `themes/hexo-theme-kira/`.
- **Templating**: EJS (`.ejs`)
- **Styling**: CSS/Stylus
- **Content**: Markdown (`.md`)

## Key Files & Directories
- `_config.yml`: Main site configuration (URL, author, extensions).
- `_config.hexo-theme-kira.yml`: Theme-specific configuration (menu, social links, friends list, colors).
- `source/_posts/`: Blog posts in Markdown.
- `source/pages/`: Custom pages (e.g., `friends`, `mine`, `archive`).
- `source/image/`: Static images referenced in posts and config (e.g., `/image/logo.webp`).
- `themes/hexo-theme-kira/layout/`: EJS templates.
  - `layout.ejs`: Main HTML skeleton.
  - `post.ejs`: Blog post layout.
  - `components/`: Reusable widgets (header, friends, comments).
- `themes/hexo-theme-kira/source/`: Theme assets (CSS, JS).

## Development Workflow
- **Create Post**: `hexo new "Post Title"` (Creates file in `source/_posts/`).
- **Run Server**: `hexo server` (Starts local server at `http://localhost:4000`).
- **Build Site**: `hexo generate` (Generates static files to `public/`).
- **Clean Cache**: `hexo clean` (Use if changes aren't reflecting).

## Project-Specific Conventions
### Theme Customization
- **Do not edit `node_modules`**. Edit files in `themes/hexo-theme-kira/`.
- **Configuration**: Most visual settings (avatar, background, menu) are in `_config.hexo-theme-kira.yml`.

### Friends Page
- **Data**: The list of friends is defined in `_config.hexo-theme-kira.yml` under the `friends` key.
- **Layout**: Controlled by `themes/hexo-theme-kira/layout/components/friends.ejs`.
- **Page File**: `source/pages/friends/index.md` (Frontmatter: `layout: friends`).

### Images
- Store images in `source/image/`.
- Reference them with absolute paths from root: `/image/filename.ext`.
- Example in config: `avatar: /image/IMG_0125.webp`.

### Custom Pages
- Located in `source/pages/<page-name>/index.md`.
- Must have `layout: <layout-name>` in frontmatter to use specific theme layouts.
