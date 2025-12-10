// 内容脚本 - 用于修改标签页标题

// 获取当前标签页ID
function getCurrentTabId() {
  return new Promise((resolve) => {
    // 尝试从消息发送者获取tabId
    chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
      if (chrome.runtime.lastError) {
        // 如果无法获取，尝试从URL参数或其他方式获取
        resolve(null);
      } else {
        resolve(response?.tabId);
      }
    });
  });
}

// 应用自定义标题
async function applyCustomTitle() {
  try {
    const tabId = await getCurrentTabId();
    if (!tabId) {
      // 如果无法获取tabId，尝试通过tabs.query获取
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const currentTabId = tabs[0].id;
          chrome.storage.local.get(['customTabTitles'], (result) => {
            const customTitles = result.customTabTitles || {};
            if (customTitles[currentTabId]) {
              document.title = customTitles[currentTabId];
            }
          });
        }
      });
      return;
    }
    
    chrome.storage.local.get(['customTabTitles'], (result) => {
      const customTitles = result.customTabTitles || {};
      if (customTitles[tabId]) {
        document.title = customTitles[tabId];
      }
    });
  } catch (error) {
    console.error('Error applying custom title:', error);
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'renameTab') {
    const customTitle = request.title;
    const tabId = request.tabId;
    
    // 获取当前标签页ID（如果未提供）
    const currentTabId = tabId || (sender.tab ? sender.tab.id : null);
    
    if (!currentTabId) {
      sendResponse({ success: false, error: '无法获取标签页ID' });
      return false;
    }
    
    // 保存自定义标题到storage
    chrome.storage.local.get(['customTabTitles'], (result) => {
      const customTitles = result.customTabTitles || {};
      
      if (customTitle && customTitle.trim()) {
        customTitles[currentTabId] = customTitle.trim();
        // 修改页面标题
        document.title = customTitle.trim();
      } else {
        delete customTitles[currentTabId];
        // 如果清空自定义标题，尝试恢复原始标题
        // 注意：原始标题可能已经被修改，这里无法完全恢复
      }
      
      chrome.storage.local.set({ customTabTitles: customTitles }, () => {
        sendResponse({ success: true, tabId: currentTabId });
      });
    });
    
    return true; // 保持消息通道开放
  } else if (request.action === 'getCustomTitle') {
    chrome.storage.local.get(['customTabTitles'], (result) => {
      const customTitles = result.customTabTitles || {};
      const tabId = request.tabId || (sender.tab ? sender.tab.id : null);
      sendResponse({ title: tabId ? (customTitles[tabId] || null) : null });
    });
    return true;
  }
  
  return false;
});

// 页面加载时检查是否有自定义标题
applyCustomTitle();

// 监听storage变化，以便在多个标签页间同步
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.customTabTitles) {
    applyCustomTitle();
  }
});

