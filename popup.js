// Popup 主逻辑

let tabManager = new TabManager();
let currentTabs = [];
let currentSuggestions = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.initLanguage();
  updateUIText();
  await loadTabs();
  setupEventListeners();
});

// 更新UI文本
function updateUIText() {
  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18n.t(key);
  });
  
  // 更新所有带有 data-i18n-title 属性的元素
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = i18n.t(key);
  });
}

// 加载标签页
async function loadTabs() {
  showLoading();
  currentTabs = await tabManager.getAllTabsWithInfo();
  currentSuggestions = tabManager.getActionSuggestions(currentTabs);
  renderTabs();
  renderSuggestions();
  updateStats();
  hideLoading();
}

// 显示加载状态
function showLoading() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('content').style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}

// 渲染标签页列表
function renderTabs() {
  const container = document.getElementById('tabs-container');
  const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
  
  if (viewMode === 'category') {
    renderByCategory(container);
  } else {
    renderByAnxiety(container);
  }
}

// 按分类渲染
function renderByCategory(container) {
  const grouped = tabManager.groupByCategory(currentTabs);
  container.innerHTML = '';
  
  Object.entries(grouped).forEach(([category, data]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-group';
    
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <span class="category-name">${data.name}</span>
      <div class="category-actions">
        <span class="category-count">${data.tabs.length}</span>
        <button class="close-category-btn" data-category="${category}">${i18n.t('closeCategory')}</button>
      </div>
    `;
    
    const tabsList = document.createElement('div');
    tabsList.className = 'tabs-list';
    
    data.tabs.forEach(tab => {
      tabsList.appendChild(createTabElement(tab));
    });
    
    categoryDiv.appendChild(header);
    categoryDiv.appendChild(tabsList);
    container.appendChild(categoryDiv);
    
    // 添加关闭分类按钮事件
    header.querySelector('.close-category-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(i18n.t('confirmCloseCategory', { category: data.name, count: data.tabs.length }))) {
        const tabIds = data.tabs.map(t => t.id);
        await tabManager.closeTabs(tabIds);
        await loadTabs();
      }
    });
  });
}

// 按焦虑值渲染
function renderByAnxiety(container) {
  container.innerHTML = '';
  currentTabs.forEach(tab => {
    container.appendChild(createTabElement(tab));
  });
}

// 创建标签页元素
function createTabElement(tab) {
  const div = document.createElement('div');
  div.className = 'tab-item';
  div.dataset.tabId = tab.id;
  
  div.innerHTML = `
    <div class="tab-header">
      <img src="${tab.favIconUrl || 'icons/default.png'}" class="tab-icon" onerror="this.src='icons/default.png'">
      <div class="tab-info">
        <div class="tab-title" title="${tab.title}">${tab.title || i18n.t('noTitle')}</div>
        <div class="tab-meta">
          <span class="tab-category">${tab.categoryName}</span>
          <span class="anxiety-score" style="color: ${tab.anxietyLevel.color}">
            ${tab.anxietyScore} - ${tab.anxietyLevel.label}
          </span>
        </div>
      </div>
      <button class="close-btn" data-tab-id="${tab.id}" title="${i18n.t('close')}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="anxiety-bar-container">
      <div class="anxiety-bar" style="width: ${tab.anxietyScore}%; background-color: ${tab.anxietyLevel.color};"></div>
    </div>
  `;
  
  // 添加点击事件
  div.querySelector('.close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tab.id);
  });
  
  div.addEventListener('click', () => {
    chrome.tabs.update(tab.id, { active: true });
    window.close();
  });
  
  return div;
}

// 渲染处理建议
function renderSuggestions() {
  const container = document.getElementById('suggestions-container');
  if (!currentSuggestions) return;
  
  container.innerHTML = '';
  
  // 明显可关闭
  if (currentSuggestions.close.length > 0) {
    const section = createSuggestionSection(i18n.t('suggestionClose'), currentSuggestions.close, 'close');
    container.appendChild(section);
  }
  
  // 可收藏归档
  if (currentSuggestions.archive.length > 0) {
    const section = createSuggestionSection(i18n.t('suggestionArchive'), currentSuggestions.archive, 'archive');
    container.appendChild(section);
  }
  
  // 建议暂存
  if (currentSuggestions.suspend.length > 0) {
    const section = createSuggestionSection(i18n.t('suggestionSuspend'), currentSuggestions.suspend, 'suspend');
    container.appendChild(section);
  }
}

// 创建建议区块
function createSuggestionSection(title, tabs, action) {
  const section = document.createElement('div');
  section.className = 'suggestion-section';
  
  const header = document.createElement('div');
  header.className = 'suggestion-header';
  header.innerHTML = `
    <span>${title} (${tabs.length})</span>
    <button class="action-btn" data-action="${action}">${i18n.t('actionProcess')}</button>
  `;
  
  const list = document.createElement('div');
  list.className = 'suggestion-list';
  tabs.slice(0, 5).forEach(tab => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.innerHTML = `
      <img src="${tab.favIconUrl || 'icons/default.png'}" class="suggestion-icon" onerror="this.src='icons/default.png'">
      <span class="suggestion-title" title="${tab.title}">${tab.title || i18n.t('noTitle')}</span>
    `;
    list.appendChild(item);
  });
  
  section.appendChild(header);
  section.appendChild(list);
  
  header.querySelector('.action-btn').addEventListener('click', () => {
    handleSuggestionAction(action, tabs);
  });
  
  return section;
}

// 处理建议操作
async function handleSuggestionAction(action, tabs) {
  const tabIds = tabs.map(t => t.id);
  
  if (action === 'close') {
    if (confirm(i18n.t('confirmCloseTabs', { count: tabs.length }))) {
      await tabManager.closeTabs(tabIds);
      await loadTabs();
    }
  } else if (action === 'archive') {
    // 先保存会话，再关闭
    const sessionName = prompt(i18n.t('enterSessionName'));
    if (sessionName !== null) {
      await tabManager.saveSession(sessionName);
      if (confirm(i18n.t('confirmCloseAfterArchive', { count: tabs.length }))) {
        await tabManager.closeTabs(tabIds);
        await loadTabs();
      }
    }
  } else if (action === 'suspend') {
    // 暂存：保存会话并关闭
    const sessionName = prompt(i18n.t('enterSessionName'));
    if (sessionName !== null) {
      await tabManager.saveSession(sessionName);
      await tabManager.closeTabs(tabIds);
      await loadTabs();
    }
  }
}

// 关闭标签页
async function closeTab(tabId) {
  await tabManager.closeTabs(tabId);
  await loadTabs();
}

// 设置事件监听
function setupEventListeners() {
  // 视图模式切换
  document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.addEventListener('change', renderTabs);
  });
  
  // 查看归档按钮
  document.getElementById('sessions-btn').addEventListener('click', showSessionsView);
  
  // 返回按钮
  document.getElementById('back-btn').addEventListener('click', hideSessionsView);
  
  // 归档按钮
  document.getElementById('archive-btn').addEventListener('click', async () => {
    const sessionName = prompt(i18n.t('enterSessionName'));
    if (sessionName !== null) { // 用户没有取消
      await tabManager.saveSession(sessionName);
      alert(i18n.t('sessionSaved'));
    }
  });
  
  // 语言切换按钮
  document.getElementById('lang-btn').addEventListener('click', async () => {
    const currentLang = i18n.getLanguage();
    const newLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
    await i18n.setLanguage(newLang);
    updateUIText();
    await loadTabs();
    await renderSessions();
  });
  
  // 刷新按钮
  document.getElementById('refresh-btn').addEventListener('click', loadTabs);
}

// 显示归档视图
async function showSessionsView() {
  document.getElementById('content').style.display = 'none';
  document.getElementById('sessions-view').style.display = 'block';
  updateUIText(); // 更新UI文本
  await renderSessions();
}

// 隐藏归档视图
function hideSessionsView() {
  document.getElementById('sessions-view').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}

// 渲染归档会话列表
async function renderSessions() {
  const sessions = await tabManager.getSessions();
  const container = document.getElementById('sessions-list');
  
  if (sessions.length === 0) {
    container.innerHTML = `<div class="empty-state">${i18n.t('noArchivedSessions')}</div>`;
    return;
  }
  
  container.innerHTML = '';
  
  // 按时间倒序排列
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  
  sessions.forEach(session => {
    const sessionDiv = document.createElement('div');
    sessionDiv.className = 'session-item';
    
    const date = new Date(session.timestamp);
    const dateFormat = i18n.translations[i18n.getLanguage()].dateFormat;
    const dateStr = date.toLocaleString(i18n.getLanguage(), dateFormat);
    
    sessionDiv.innerHTML = `
      <div class="session-header">
        <div class="session-info">
          <h3 class="session-name">${session.name}</h3>
          <span class="session-date">${dateStr}</span>
        </div>
        <div class="session-count">${session.tabs.length} ${i18n.t('sessionTabs')}</div>
      </div>
      <div class="session-actions">
        <button class="restore-btn" data-session-id="${session.id}">${i18n.t('restoreSession')}</button>
        <button class="delete-btn" data-session-id="${session.id}">${i18n.t('delete')}</button>
      </div>
      <div class="session-tabs-preview">
        ${session.tabs.slice(0, 5).map(tab => `
          <div class="session-tab-preview">
            <img src="${tab.favIconUrl || 'icons/default.png'}" class="session-tab-icon" onerror="this.src='icons/default.png'">
            <span class="session-tab-title" title="${tab.title}">${tab.title || i18n.t('noTitle')}</span>
          </div>
        `).join('')}
        ${session.tabs.length > 5 ? `<div class="session-more">${i18n.t('moreTabs', { count: session.tabs.length - 5 })}</div>` : ''}
      </div>
    `;
    
    // 恢复会话按钮
    sessionDiv.querySelector('.restore-btn').addEventListener('click', async () => {
      await restoreSession(session);
    });
    
    // 删除会话按钮
    sessionDiv.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm(i18n.t('confirmDeleteSession', { name: session.name }))) {
        await tabManager.deleteSession(session.id);
        await renderSessions();
      }
    });
    
    container.appendChild(sessionDiv);
  });
}

// 恢复会话
async function restoreSession(session) {
  // 在新窗口中打开所有标签页
  for (const tab of session.tabs) {
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      chrome.tabs.create({ url: tab.url });
    }
  }
  alert(i18n.t('sessionRestored', { count: session.tabs.length }));
}

// 更新统计信息
function updateStats() {
  const totalTabs = currentTabs.length;
  const highAnxiety = currentTabs.filter(t => t.anxietyScore >= 70).length;
  const duplicateDomains = new Set(
    currentTabs.map(t => t.domain).filter(d => d)
  ).size;
  
  document.getElementById('stats').innerHTML = `
    ${i18n.t('totalTabs')}: ${totalTabs} | 
    ${i18n.t('highAnxiety')}: ${highAnxiety} | 
    ${i18n.t('domains')}: ${duplicateDomains}
  `;
}

// 定期更新
setInterval(() => {
  if (document.getElementById('content').style.display !== 'none') {
    loadTabs();
  }
}, 30000); // 每30秒更新一次

