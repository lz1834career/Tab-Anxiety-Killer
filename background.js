// Background Service Worker

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 可以在这里添加标签页更新时的逻辑
  // 例如：更新焦虑值、重新分类等
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 可以在这里添加标签页关闭时的清理逻辑
});

// 监听安装
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Anxiety Killer 已安装');
});

