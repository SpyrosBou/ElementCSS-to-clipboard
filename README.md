# ElementCSS-to-clipboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Chrome DevTools extension that copies CSS from the selected element to your clipboard with one click.

## Features

Three buttons in the Elements panel sidebar:

- **Copy Computed** — Non-default computed styles only (filters out browser defaults by comparing against a reference element)
- **Copy Styles** — Matched CSS rules from stylesheets, grouped by selector with source file attribution
- **Copy Animations** — CSS animations, transitions, active Web Animations, and full `@keyframes` definitions

All outputs include element identification (tag, id, classes, selector path) as CSS comments.

## Install

### From Chrome Web Store

<!-- TODO: Add Chrome Web Store link after publishing -->
Coming soon.

### From Source

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder
5. Open DevTools on any page — find **"Style Copier"** in the Elements panel sidebar tabs

## Usage

1. Open Chrome DevTools (`F12` or `Cmd+Opt+I`)
2. Select any element in the **Elements** panel
3. Click the **Style Copier** tab in the sidebar (next to Styles / Computed)
4. Click one of the three buttons — the CSS is copied to your clipboard

### Example Output

**Copy Computed:**
```css
/* Element: div#main.card */
/* Selector: body > div#app > div#main.card */
/* Source: Computed (non-default) styles */

display: flex;
padding: 16px;
background-color: rgb(255, 255, 255);
border-radius: 8px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
```

**Copy Styles:**
```css
/* Element: div#main.card */
/* Source: Matched CSS rules */

/* --- .card (styles.css) --- */
background: rgb(255, 255, 255);
border: 1px solid rgb(224, 224, 224);
border-radius: 8px;
padding: 20px;

/* --- .card (theme.css) @media (min-width: 600px) --- */
max-width: 720px;
```

**Copy Animations:**
```css
/* Element: div.animated-pulse */
/* Source: Animations & Transitions */

/* --- CSS Animation Properties --- */
animation-name: pulse;
animation-duration: 2s;
animation-timing-function: ease-in-out;
animation-iteration-count: infinite;

/* --- @keyframes (from stylesheets) --- */
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
```

## Limitations

- Cross-origin stylesheets cannot be read (browser security restriction) — a warning comment is included in the output
- Pseudo-class rules (`:hover`, `:focus`) only appear when the state is active
- Shadow DOM scoped stylesheets are not traversed

## Chrome Web Store Description

> Copy CSS from any element in Chrome DevTools with one click. Three modes: computed styles (non-default only), matched CSS rules (with selectors and source files), and animations (including full @keyframes). No data collection, no network requests — everything runs locally.

## License

[MIT](LICENSE)
