const tabCache = new Map();
const MAX_TABS = 500;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && !tab.url.startsWith('chrome://')) {
    tabCache.set(tabId, { title: tab.title || '', url: tab.url, favicon: tab.favIconUrl || '' });
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const cached = tabCache.get(tabId);
  if (!cached || !cached.url) return;
  tabCache.delete(tabId);

  const { closedTabs = [], settings = {} } = await chrome.storage.local.get(['closedTabs', 'settings']);
  const maxHistory = settings.maxHistory || MAX_TABS;

  closedTabs.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: cached.title, url: cached.url, favicon: cached.favicon, closedAt: Date.now() });

  if (closedTabs.length > maxHistory) closedTabs.length = maxHistory;

  // Auto-purge old entries
  const purgeDays = settings.autoPurgeDays || 0;
  if (purgeDays > 0) {
    const cutoff = Date.now() - purgeDays * 86400000;
    const filtered = closedTabs.filter(t => t.closedAt > cutoff);
    await chrome.storage.local.set({ closedTabs: filtered });
  } else {
    await chrome.storage.local.set({ closedTabs });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'restore') {
    chrome.tabs.create({ url: msg.url });
    sendResponse({ ok: true });
  }
  if (msg.action === 'delete') {
    chrome.storage.local.get(['closedTabs'], (r) => {
      const tabs = (r.closedTabs || []).filter(t => t.id !== msg.id);
      chrome.storage.local.set({ closedTabs: tabs }, () => sendResponse({ ok: true }));
    });
    return true;
  }
  if (msg.action === 'restoreAll') {
    const urls = msg.urls || [];
    urls.forEach(url => chrome.tabs.create({ url }));
    sendResponse({ ok: true });
  }
  if (msg.action === 'clearAll') {
    chrome.storage.local.set({ closedTabs: [] }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === 'exportJSON') {
    chrome.storage.local.get(['closedTabs'], (r) => sendResponse({ data: r.closedTabs || [] }));
    return true;
  }
});
