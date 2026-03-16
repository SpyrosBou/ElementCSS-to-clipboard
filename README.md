# ElementCSS-to-clipboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Chrome DevTools extension that copies CSS from any element to your clipboard — via sidebar buttons, keyboard shortcuts, or right-click context menu.

## Features

Three ways to copy CSS from an element:

### Sidebar Panel (in DevTools Elements tab)
- **Copy Computed** — Non-default computed styles (filtered against browser defaults)
- **Copy Styles** — Matched CSS rules from stylesheets, with selectors and source attribution
- **Copy Animations** — CSS animations, transitions, and full `@keyframes` definitions

### Keyboard Shortcuts
| Shortcut | Mac | Action |
|----------|-----|--------|
| `Ctrl+Shift+1` | `Cmd+Shift+1` | Copy computed styles |
| `Ctrl+Shift+2` | `Cmd+Shift+2` | Copy matched CSS rules |
| `Ctrl+Shift+3` | `Cmd+Shift+3` | Copy animations |

Shortcuts can be customized at `chrome://extensions/shortcuts`.

### Right-Click Context Menu
Right-click any element on the page → **Style Copier** → choose what to copy.

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
5. Open DevTools on any page — find **"Style Copier"** in the Elements panel sidebar

## Usage

**Sidebar:** Select an element in the Elements panel → click a button in the Style Copier sidebar tab.

**Keyboard:** Select an element in Elements panel → press a shortcut.

**Right-click:** Right-click any element on the page → Style Copier → choose an option.

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

- Cross-origin stylesheets cannot be read (browser security) — a warning is included
- Pseudo-class rules (`:hover`, `:focus`) only appear when the state is active
- Shadow DOM scoped stylesheets are not traversed

## Chrome Web Store Description

> Copy CSS from any element in Chrome DevTools with one click, a keyboard shortcut, or the right-click menu. Three modes: computed styles (non-default only), matched CSS rules (with selectors and source files), and animations (including full @keyframes). No data collection, no network requests — everything runs locally.

## License

[MIT](LICENSE)
