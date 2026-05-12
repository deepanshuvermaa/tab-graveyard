const PER_PAGE = 20;
let allTabs = [];
let filtered = [];
let page = 0;

document.addEventListener('DOMContentLoaded', load);

function load() {
  chrome.storage.local.get(['closedTabs'], (r) => {
    allTabs = r.closedTabs || [];
    filtered = allTabs;
    page = 0;
    render();
  });
}

function render() {
  const list = document.getElementById('tabsList');
  const start = page * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty"><p>No closed tabs yet.</p></div>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  let html = '';
  let lastGroup = '';
  slice.forEach(tab => {
    const group = getGroup(tab.closedAt);
    if (group !== lastGroup) {
      lastGroup = group;
      html += `<div class="group-label">${group}</div>`;
    }
    const favicon = tab.favicon || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
    html += `<div class="tab-item" data-url="${esc(tab.url)}">
      <img class="tab-favicon" src="${esc(favicon)}" onerror="this.style.display='none'">
      <div class="tab-info"><div class="tab-title">${esc(tab.title || tab.url)}</div><div class="tab-url">${esc(tab.url)}</div></div>
      <span class="tab-time">${timeAgo(tab.closedAt)}</span>
      <button class="tab-del" data-id="${tab.id}" title="Delete">×</button>
    </div>`;
  });
  list.innerHTML = html;

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pag = document.getElementById('pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  pag.innerHTML = `<button id="prevBtn" ${page === 0 ? 'disabled' : ''}>← Prev</button><span>${page + 1} / ${totalPages}</span><button id="nextBtn" ${page >= totalPages - 1 ? 'disabled' : ''}>Next →</button>`;
  document.getElementById('prevBtn').onclick = () => { page--; render(); };
  document.getElementById('nextBtn').onclick = () => { page++; render(); };
}

document.getElementById('tabsList').addEventListener('click', (e) => {
  const del = e.target.closest('.tab-del');
  if (del) {
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'delete', id: del.dataset.id }, load);
    return;
  }
  const item = e.target.closest('.tab-item');
  if (item) chrome.runtime.sendMessage({ action: 'restore', url: item.dataset.url });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  filtered = q ? allTabs.filter(t => (t.title + t.url).toLowerCase().includes(q)) : allTabs;
  page = 0;
  render();
});

document.getElementById('restoreAllBtn').addEventListener('click', () => {
  const today = new Date().toDateString();
  const urls = allTabs.filter(t => new Date(t.closedAt).toDateString() === today).map(t => t.url);
  if (urls.length === 0) return;
  if (confirm(`Restore ${urls.length} tabs from today?`)) {
    chrome.runtime.sendMessage({ action: 'restoreAll', urls });
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'exportJSON' }, (res) => {
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tab-graveyard-export.json'; a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

function getGroup(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const weekAgo = new Date(today - 7 * 86400000);
  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  if (d >= weekAgo) return 'This Week';
  return 'Older';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
