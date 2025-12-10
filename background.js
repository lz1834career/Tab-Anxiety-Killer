// Background Service Worker

let notificationSettings = {
  tabCount: { enabled: false, threshold: 50 },
  highAnxiety: { enabled: false, threshold: 70 },
  cleanup: { enabled: false, interval: 7 },
  backup: { enabled: false, interval: 7 }
};

let lastCleanupTime = null;
let lastBackupTime = null;

// 加载通知设置
function loadNotificationSettings() {
  chrome.storage.local.get(['notificationSettings', 'lastCleanupTime', 'lastBackupTime'], (result) => {
    if (result.notificationSettings) {
      notificationSettings = result.notificationSettings;
    }
    if (result.lastCleanupTime) {
      lastCleanupTime = result.lastCleanupTime;
    }
    if (result.lastBackupTime) {
      lastBackupTime = result.lastBackupTime;
    }
  });
}

// 初始化
loadNotificationSettings();

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 检查标签页数量提醒
  if (notificationSettings.tabCount.enabled) {
    checkTabCount();
  }
  
  // 检查高焦虑标签页提醒
  if (notificationSettings.highAnxiety.enabled) {
    checkHighAnxietyTabs();
  }
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 清理该标签页的自定义标题（可选，节省存储空间）
  chrome.storage.local.get(['customTabTitles'], (result) => {
    const customTitles = result.customTabTitles || {};
    if (customTitles[tabId]) {
      delete customTitles[tabId];
      chrome.storage.local.set({ customTabTitles: customTitles });
    }
  });
});

// 监听安装
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装时的逻辑
  } else if (details.reason === 'update') {
    // 更新时的逻辑
  }
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentTabId') {
    if (sender.tab) {
      sendResponse({ tabId: sender.tab.id });
    } else {
      sendResponse({ tabId: null });
    }
    return true;
  } else if (request.action === 'updateNotificationSettings') {
    notificationSettings = request.settings;
    loadNotificationSettings();
    sendResponse({ success: true });
    return true;
  }
});

// 检查标签页数量
async function checkTabCount() {
  try {
    const tabs = await chrome.tabs.query({});
    const count = tabs.length;
    
    if (count >= notificationSettings.tabCount.threshold) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '标签页过多',
        message: `您当前打开了 ${count} 个标签页，建议关闭一些。`
      });
    }
  } catch (error) {
    console.error('检查标签页数量失败:', error);
  }
}

// 检查高焦虑标签页
async function checkHighAnxietyTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    // 这里需要计算焦虑值，简化处理
    // 实际应该调用 tabManager 的相关方法
    // 暂时跳过具体实现，因为需要引入 tabManager 的依赖
  } catch (error) {
    console.error('检查高焦虑标签页失败:', error);
  }
}

// 定期检查清理提醒
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup-reminder' && notificationSettings.cleanup.enabled) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '该清理了',
      message: '距离上次清理已经有一段时间了，建议整理一下标签页。'
    });
    lastCleanupTime = Date.now();
    chrome.storage.local.set({ lastCleanupTime });
    scheduleCleanupReminder();
  } else if (alarm.name === 'backup-reminder' && notificationSettings.backup.enabled) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '备份提醒',
      message: '别忘了备份您的会话数据。'
    });
    lastBackupTime = Date.now();
    chrome.storage.local.set({ lastBackupTime });
    scheduleBackupReminder();
  }
});

// 安排清理提醒
function scheduleCleanupReminder() {
  if (!notificationSettings.cleanup.enabled) return;
  
  const interval = notificationSettings.cleanup.interval * 24 * 60 * 60 * 1000; // 转换为毫秒
  chrome.alarms.create('cleanup-reminder', { delayInMinutes: interval / (60 * 1000) });
}

// 安排备份提醒
function scheduleBackupReminder() {
  if (!notificationSettings.backup.enabled) return;
  
  const interval = notificationSettings.backup.interval * 24 * 60 * 60 * 1000; // 转换为毫秒
  chrome.alarms.create('backup-reminder', { delayInMinutes: interval / (60 * 1000) });
}

// 监听设置更新
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.notificationSettings) {
    notificationSettings = changes.notificationSettings.newValue;
    if (notificationSettings.cleanup.enabled) {
      scheduleCleanupReminder();
    }
    if (notificationSettings.backup.enabled) {
      scheduleBackupReminder();
    }
  }
});

// 初始化提醒
if (notificationSettings.cleanup.enabled) {
  scheduleCleanupReminder();
}
if (notificationSettings.backup.enabled) {
  scheduleBackupReminder();
}

