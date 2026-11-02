# LOCAYTER website

Static website. No build step or package installation is required.

## Files

- `index.html`: page structure, copy and links.
- `css/styles.css`: shared design tokens, base layout, components and demo video player.
- `css/page.css`: current page-specific components and responsive refinements. Keep this after `styles.css` to preserve the existing cascade.
- `js/navigation.js`: mobile menu.
- `js/property-preview.js`: filters, postcode validation, map preview and sample search results.
- `js/feature-tabs.js`: feature selection.
- `js/faq.js`: quick questions and chat panel.
- `js/lead-calculator.js`: introductory calculator dialog.
- `js/campaign-calculator.js`: Ryan’s campaign estimates and sliders.
- `js/reveal.js`: scroll reveal effects.
- `js/demo-video.js`: demo player, closing controls and focus restoration.
- `assets/`: branding, approved demo video and poster.
- `CNAME`: live custom domain.

## Preview

Open `index.html` directly, or run `python3 -m http.server 8000` from this folder and visit http://localhost:8000.

Scripts use classic JavaScript, not ES modules, so direct-file previews work. Map services still require an internet connection; the existing offline example remains available.

## Editing and publishing

Keep structure and copy in HTML, styles in CSS, and interactions in the relevant JavaScript file. Preserve stylesheet and script order. Each interaction script has its own function scope to avoid global name collisions.

Publish `index.html`, `css/`, `js/`, `assets/` and `CNAME` together. This checkout’s `main` tracks `shared/main` in `Lead-Gen-RJG/Lead-Gen-Tool-Website`; the `origin` remote points to the older personal repository.
