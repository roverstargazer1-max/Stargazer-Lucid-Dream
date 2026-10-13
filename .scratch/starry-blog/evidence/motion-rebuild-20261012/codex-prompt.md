You are an independent senior front-end/UI-engineering reviewer. Audit ONLY, do not modify any file.

Project: a Hexo blog with a custom theme at `themes/stargazer-starfield`. It is a "lucid dream starfield" experience: a painted bedroom, a window you pass through into a live painted sky, articles as stars, an observation panel, an article reader, and a star-chart search dialog.

Art direction: Japanese painterly (厚涂) anime + editorial graphic design + minimal futurism. Deep blue / cobalt / royal blue, cool white, cyan, a little blue-violet. Large quiet negative space. Tech feel comes from typography, proportion and graphic order (hairline ticks, arcs, chamfered geometry, silhouette, technical numerals) — NOT from neon glow or generic sci-fi chrome.

The author's verdict: "many of the interactions and motion designs are very crude and simple." I need an independent, concrete diagnosis.

Read these files (do not read node_modules, .preview, .git, or public):
- themes/stargazer-starfield/source/js/starfield/*.js  (esp. app.js, motion.js, room-scene.js, observation.js, search.js, interactive-clouds.js, polyhedron.js)
- themes/stargazer-starfield/source/css/starry/*.css
- themes/stargazer-starfield/layout/partial/*.ejs and layout/layout.ejs
- docs/design/starry-blog.md (skim: it is the design intent record, in Chinese)

Report, concretely and with file:line references:

1. **Easing & timing inconsistency.** Every distinct easing curve and duration currently in use. Which are arbitrary/duplicated/inconsistent? Is there any shared easing system? List every magic-number duration.

2. **Crude or missing interactions.** Enumerate every interactive moment (hover, focus, press, selection, transition, dismissal) and rate each as: well-built / thin / missing. Be specific about which are thin — e.g. bare `opacity` swaps, instant visibility flips, no press feedback, no stagger, no continuity between states.

3. **Dead or unreachable UI.** Find elements that exist in the DOM/CSS but can never be reached or are never shown (I already suspect `#journal-egg`, `#signal-egg`, `.mode-note`, `.preview-body`, `.preview-scroll`, `.relation-cues`, `.world-footer`). Confirm and list all, with evidence.

4. **Duplicated logic.** Any place the same visual behaviour is implemented more than once (e.g. CSS transition + JS timeline doing the same thing; two different dialog-animation paths; repeated border/hairline declarations).

5. **Continuity gaps.** Where the UI "jumps" rather than flowing: instant attribute flips with no transition, elements that appear/disappear without continuity, state changes that don't animate from the previous visual state.

6. **Accessibility-policy risks.** Any animation that ignores `prefers-reduced-motion`, any hover-only affordance, any focus state that is missing or invisible.

Output a prioritized list: the 10 highest-impact changes, each with (a) the file:line, (b) what is wrong, (c) what "good" would look like. Be blunt and specific. Do not write code. Do not modify files. Write your report to `.scratch/starry-blog/evidence/motion-rebuild-20261012/codex-audit.md`.
