// Veritas Chrome Extension - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "veritas-verify-selection",
    title: "Verify selection with Veritas",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "veritas-verify-page",
    title: "Verify this entire article URL",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { apiUrl = "http://localhost:8000/api/v1", webUrl = "http://localhost:5173" } =
    await chrome.storage.sync.get(["apiUrl", "webUrl"]);

  if (info.menuItemId === "veritas-verify-selection" && info.selectionText) {
    try {
      const headline = info.selectionText.slice(0, 80) + (info.selectionText.length > 80 ? "..." : "");
      const response = await fetch(`${apiUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline,
          content: info.selectionText
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const result = await response.json();
      const reportUrl = `${webUrl}/results/${result.id}`;
      
      // Open report in a new tab
      chrome.tabs.create({ url: reportUrl });
    } catch (err) {
      console.error("Veritas verification failed:", err);
    }
  } else if (info.menuItemId === "veritas-verify-page" && tab?.url) {
    try {
      const response = await fetch(`${apiUrl}/analyze-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: tab.url,
          headline: tab.title || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const result = await response.json();
      const reportUrl = `${webUrl}/results/${result.id}`;
      chrome.tabs.create({ url: reportUrl });
    } catch (err) {
      console.error("Veritas URL verification failed:", err);
    }
  }
});
