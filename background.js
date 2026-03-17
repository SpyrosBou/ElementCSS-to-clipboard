// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "element-css",
    title: "ElementCSS",
    contexts: ["all"]
  });

  const items = [
    { id: "copy-computed", title: "Copy Computed Styles" },
    { id: "copy-styles", title: "Copy Matched CSS Rules" },
    { id: "copy-animations", title: "Copy Animations & Transitions" }
  ];

  for (const item of items) {
    chrome.contextMenus.create({
      id: item.id,
      parentId: "element-css",
      title: item.title,
      contexts: ["all"]
    });
  }
});

// Ensure content script is injected before sending a message
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch {
    // Script may already be injected or tab may not be scriptable
  }
}

// Context menu clicks → ensure content script, then message it
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  await ensureContentScript(tab.id);
  chrome.tabs.sendMessage(tab.id, { source: "context-menu", action: info.menuItemId }).catch(() => {});
});

// Keyboard shortcuts → forward to both sidebar (for DevTools $0) and content script (fallback)
chrome.commands.onCommand.addListener(async (command) => {
  // Broadcast to extension pages (sidebar picks this up for DevTools $0)
  chrome.runtime.sendMessage({ source: "keyboard", action: command }).catch(() => {});

  // Also send to active tab's content script (for right-click element fallback)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await ensureContentScript(tab.id);
    chrome.tabs.sendMessage(tab.id, { source: "keyboard", action: command }).catch(() => {});
  }
});
