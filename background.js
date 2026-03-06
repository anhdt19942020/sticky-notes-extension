// Service Worker: handles icon click → open/close side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Allow side panel on all URLs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await chrome.sidePanel.setOptions({
    tabId,
    path: "side_panel.html",
    enabled: true,
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === "complete") {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "side_panel.html",
      enabled: true,
    });
  }
});
