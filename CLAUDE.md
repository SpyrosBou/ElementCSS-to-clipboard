# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ElementCSS is a Chrome DevTools extension (Manifest V3) that copies CSS from any element to the clipboard via three interfaces: a DevTools sidebar panel, keyboard shortcuts, and a right-click context menu. Vanilla JavaScript, no build tools, no dependencies.

## Development

No build step, no package manager, no test runner. To develop:

1. Open `chrome://extensions`, enable Developer mode
2. Click "Load unpacked" and select this repo folder
3. After code changes, click the reload button on the extension card
4. **Close and reopen DevTools** after reloading (required for sidebar/devtools changes to take effect)
5. Use `test/test-page.html` for manual testing of extraction against known CSS patterns

To repackage for release:
```
zip -r ElementCSS-<version>.zip manifest.json background.js content.js devtools.js devtools.html sidebar/ icons/ test/ README.md PRIVACY.md LICENSE -x "*.DS_Store"
```

## Architecture

### Multi-context design with three extraction pathways

```
background.js (service worker) — lifecycle, context menus, routes keyboard shortcuts
    │
    ├──→ sidebar/sidebar.js (DevTools panel) — primary UI, uses chrome.devtools.inspectedWindow.eval() with $0
    │
    └──→ content.js (injected on all pages) — handles context menu + keyboard shortcut fallback
```

### Message flow

- **Sidebar buttons**: No messaging. Directly evals extraction code in the inspected page via `chrome.devtools.inspectedWindow.eval()`, which has access to `$0` (DevTools-selected element).
- **Keyboard shortcuts** (`Ctrl/Cmd+Shift+1/2/3`): Background broadcasts to both sidebar (via `chrome.runtime.sendMessage`) AND content script (via `chrome.tabs.sendMessage`). Sidebar wins if DevTools is open; content script is fallback.
- **Context menu**: Background sends to content script only via `chrome.tabs.sendMessage`. Content script uses the last right-clicked element (`lastRightClicked`).

Message schema is consistent: `{ source: "keyboard"|"context-menu", action: "copy-computed"|"copy-styles"|"copy-animations" }`.

### Intentional code duplication

sidebar.js and content.js both implement CSS extraction logic independently. This is **by design** — sidebar generates code-as-string for `eval()` and returns structured data objects, while content.js uses direct DOM APIs on live element references and returns formatted strings. They cannot share code without introducing a build step.

### Clipboard

- Sidebar uses `navigator.clipboard.writeText()` (async, modern)
- Content script uses textarea + `document.execCommand("copy")` (sync fallback, works in content script context)
