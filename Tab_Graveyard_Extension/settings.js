document.addEventListener('DOMContentLoaded', loadSettings);

function loadSettings() {
  chrome.storage.local.get(['notifyOnClose', 'autoRestore', 'maxTabs'], (result) => {
    document.getElementById('notifyOnClose').checked = result.notifyOnClose !== false;
    document.getElementById('autoRestore').checked = result.autoRestore !== false;
    document.getElementById('maxTabs').value = result.maxTabs || 100;
  });
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const settings = {
    notifyOnClose: document.getElementById('notifyOnClose').checked,
    autoRestore: document.getElementById('autoRestore').checked,
    maxTabs: parseInt(document.getElementById('maxTabs').value)
  };
  
  chrome.storage.local.set(settings, () => {
    alert('Settings saved successfully!');
  });
});
