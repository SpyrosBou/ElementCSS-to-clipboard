// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  const items = [
    { id: "copy-computed", title: "Copy Computed Styles" },
    { id: "copy-styles", title: "Copy Matched CSS Rules" },
    { id: "copy-animations", title: "Copy Animations & Transitions" }
  ];

  chrome.contextMenus.create({
    id: "element-css",
    title: "ElementCSS",
    contexts: ["all"]
  });

  for (const item of items) {
    chrome.contextMenus.create({
      id: item.id,
      parentId: "element-css",
      title: item.title,
      contexts: ["all"]
    });
  }
});

// Context menu clicks → message content script
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { source: "context-menu", action: info.menuItemId });
});

// Keyboard shortcuts → forward to both sidebar (for DevTools $0) and content script (fallback)
chrome.commands.onCommand.addListener((command) => {
  // Broadcast to extension pages (sidebar picks this up for DevTools $0)
  chrome.runtime.sendMessage({ source: "keyboard", action: command }).catch(() => {});

  // Also send to active tab's content script (for right-click element fallback)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { source: "keyboard", action: command }).catch(() => {});
    }
  });
});
