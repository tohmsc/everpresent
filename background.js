// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.everpresentText) {
    // Broadcast the new text to all tabs
    chrome.tabs.query({}, async (tabs) => {
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'UPDATE_TEXT',
            text: changes.everpresentText.newValue
          });
        } catch {
          // Ignore errors for tabs that don't have the content script
        }
      }
    });
  }
}); 