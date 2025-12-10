// Popup 主逻辑

let tabManager = new TabManager();
let currentTabs = [];
let currentSuggestions = null;
let filteredTabs = [];
let selectedTabs = new Set(); // 批量选择
let isBatchMode = false; // 批量模式
let tabCache = new SimpleCache(200, 3 * 60 * 1000); // 缓存3分钟
let savedScrollTop = 0; // 保存的滚动位置

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await i18n.initLanguage();
  await themes.initTheme();
  await initAccessibility();
  updateUIText();
  updateThemeSelector();
  await loadTabs();
  setupEventListeners();
  
  // 更新 ARIA 属性
  updateAriaAttributes();
});

// 更新主题选择器显示
function updateThemeSelector() {
  const currentTheme = themes.getCurrentTheme();
  const themeLabel = document.getElementById('theme-label');
  const themeLabelInline = document.getElementById('theme-label-inline');
  if (themeLabel) {
    themeLabel.textContent = themes.getThemeLabel(currentTheme);
  }
  if (themeLabelInline) {
    themeLabelInline.textContent = themes.getThemeLabel(currentTheme);
  }
  renderThemeMenu();
}

// 渲染主题菜单
function renderThemeMenu() {
  const menu = document.getElementById('theme-menu');
  if (!menu) return;
  
  menu.innerHTML = '';
  const allThemes = themes.getAllThemes();
  const currentTheme = themes.getCurrentTheme();
  
  Object.keys(allThemes).forEach(themeName => {
    const theme = allThemes[themeName];
    const item = document.createElement('div');
    item.className = 'theme-menu-item';
    if (themeName === currentTheme) {
      item.classList.add('active');
    }
    
    item.innerHTML = `
      <span class="theme-menu-label">${themes.getThemeLabel(themeName)}</span>
      ${themeName === currentTheme ? '<span class="theme-check">✓</span>' : ''}
    `;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      themes.applyTheme(themeName);
      updateThemeSelector();
      // 点击后关闭菜单（由于是hover显示，点击后关闭是合理的）
      menu.classList.remove('show');
      // 重置位置
      menu.style.position = '';
      menu.style.top = '';
      menu.style.left = '';
      menu.style.right = '';
      menu.style.width = '';
      // 关闭更多菜单
      const moreMenu = document.getElementById('more-menu');
      if (moreMenu) moreMenu.style.display = 'none';
    });
    
    menu.appendChild(item);
  });
}

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
  
  // 更新所有带有 data-i18n-placeholder 属性的元素
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = i18n.t(key);
  });
  
  // 更新批量操作栏文本
  const batchCount = document.getElementById('batch-count');
  if (batchCount) {
    batchCount.textContent = i18n.t('selectedTabs', { count: selectedTabs.size }) || `已选择 ${selectedTabs.size} 个`;
  }
}

// 加载标签页（带缓存和错误处理）
async function loadTabs() {
  try {
    // 保存滚动位置
    const container = document.getElementById('tabs-container');
    if (container) {
      savedScrollTop = container.scrollTop;
    }
    
    showLoading();
    
    // 检查缓存
    const cacheKey = 'all_tabs_' + Date.now().toString().slice(0, -3); // 秒级缓存键
    const cached = tabCache.get(cacheKey);
    
    if (cached) {
      currentTabs = cached;
    } else {
      currentTabs = await tabManager.getAllTabsWithInfo();
      tabCache.set(cacheKey, currentTabs);
    }
    
    currentSuggestions = tabManager.getActionSuggestions(currentTabs);
    applyFiltersAndSearch();
    renderTabs();
    renderSuggestions();
    updateStats();
    hideLoading();
    
    // 恢复滚动位置
    if (container && savedScrollTop > 0) {
      requestAnimationFrame(() => {
        container.scrollTop = savedScrollTop;
      });
    }
  } catch (error) {
    toast.error(i18n.t('loadError') || '加载标签页失败，请重试');
    hideLoading();
  }
}

// 搜索历史
let searchHistory = [];
let currentSearchPattern = null;

// 加载搜索历史
async function loadSearchHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['searchHistory'], (result) => {
      searchHistory = result.searchHistory || [];
      resolve();
    });
  });
}

// 保存搜索历史
async function saveSearchHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ searchHistory: searchHistory.slice(0, 10) }, () => {
      resolve();
    });
  });
}

// 添加搜索历史
async function addToSearchHistory(searchText) {
  if (!searchText || searchText.length < 2) return;
  searchHistory = searchHistory.filter(s => s !== searchText);
  searchHistory.unshift(searchText);
  searchHistory = searchHistory.slice(0, 10);
  await saveSearchHistory();
  renderSearchHistory();
}

// 渲染搜索历史
function renderSearchHistory() {
  const historyList = document.getElementById('search-history-list');
  if (!historyList) return;
  
  if (searchHistory.length === 0) {
    historyList.innerHTML = '<div class="empty-history">无搜索历史</div>';
    return;
  }
  
  historyList.innerHTML = searchHistory.map(term => `
    <div class="history-item" data-term="${term}">${term}</div>
  `).join('');
  
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('search-input').value = item.dataset.term;
      applyFiltersAndSearch();
      renderTabs();
    });
  });
}

// 高亮搜索文本
function highlightSearchText(text, pattern, useRegex = false, caseSensitive = false) {
  if (!pattern) return text;
  
  try {
    let regex;
    if (useRegex) {
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }
    
    return text.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`);
  } catch (e) {
    // 正则表达式错误，使用普通搜索
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    return text.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`);
  }
}

// 应用筛选和搜索
function applyFiltersAndSearch() {
  let result = [...currentTabs];
  
  // 搜索筛选
  const searchInput = document.getElementById('search-input');
  const searchText = searchInput?.value.trim() || '';
  const useRegex = document.getElementById('use-regex')?.checked || false;
  const caseSensitive = document.getElementById('case-sensitive')?.checked || false;
  
  if (searchText) {
    currentSearchPattern = { text: searchText, useRegex, caseSensitive };
    
    try {
      let regex;
      if (useRegex) {
        regex = new RegExp(searchText, caseSensitive ? '' : 'i');
      } else {
        const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, caseSensitive ? '' : 'i');
      }
      
      result = result.filter(tab => {
        const title = tab.title || '';
        const url = tab.url || '';
        const category = tab.categoryName || '';
        return regex.test(title) || regex.test(url) || regex.test(category);
      });
      
      // 添加到搜索历史
      if (!useRegex) {
        addToSearchHistory(searchText);
      }
    } catch (e) {
      // 正则表达式错误，使用普通搜索
      const lowerText = caseSensitive ? searchText : searchText.toLowerCase();
      result = result.filter(tab => {
        const title = (tab.title || '');
        const url = (tab.url || '');
        const category = (tab.categoryName || '');
        const searchTitle = caseSensitive ? title : title.toLowerCase();
        const searchUrl = caseSensitive ? url : url.toLowerCase();
        const searchCategory = caseSensitive ? category : category.toLowerCase();
        return searchTitle.includes(lowerText) || searchUrl.includes(lowerText) || searchCategory.includes(lowerText);
      });
    }
  } else {
    currentSearchPattern = null;
  }
  
  // 焦虑值筛选
  const anxietyFilter = document.getElementById('anxiety-filter')?.value || 'all';
  if (anxietyFilter !== 'all') {
    result = result.filter(tab => {
      const score = tab.anxietyScore || 0;
      if (anxietyFilter === 'high') return score >= 70;
      if (anxietyFilter === 'medium') return score >= 40 && score < 70;
      if (anxietyFilter === 'low') return score < 40;
      return true;
    });
  }
  
  // 分类筛选
  const categoryFilter = document.getElementById('category-filter')?.value || 'all';
  if (categoryFilter !== 'all') {
    result = result.filter(tab => tab.category === categoryFilter);
  }
  
  // 更新筛选结果
  filteredTabs = result;
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
  
  // 检查是否有筛选条件
  const hasSearch = document.getElementById('search-input')?.value.trim() || '';
  const hasAnxietyFilter = document.getElementById('anxiety-filter')?.value !== 'all';
  const hasCategoryFilter = document.getElementById('category-filter')?.value !== 'all';
  const hasFilters = hasSearch || hasAnxietyFilter || hasCategoryFilter;
  
  // 如果有筛选条件，使用筛选后的标签页；否则使用全部标签页
  const tabsToRender = hasFilters ? filteredTabs : currentTabs;
  
  if (viewMode === 'category') {
    renderByCategory(container, tabsToRender);
  } else if (viewMode === 'group') {
    renderByGroup(container, tabsToRender).catch(error => {
      console.error('渲染分组失败:', error);
      toast.error(i18n.t('renderError') || '渲染失败');
    });
  } else {
    renderByAnxiety(container, tabsToRender);
  }
  
  // 显示无结果提示
  if (tabsToRender.length === 0 && currentTabs.length > 0 && hasFilters) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = i18n.t('noResults');
    container.innerHTML = '';
    container.appendChild(noResults);
  }
}

// 按分类渲染
function renderByCategory(container, tabs = currentTabs) {
  const grouped = tabManager.groupByCategory(tabs);
  container.innerHTML = '';
  
  Object.entries(grouped).forEach(([category, data]) => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-group';
    
    // 计算总焦虑值
    const totalAnxiety = data.totalAnxiety || data.tabs.reduce((sum, tab) => sum + (tab.anxietyScore || 0), 0);
    const avgAnxiety = data.avgAnxiety || Math.round(totalAnxiety / data.tabs.length);
    const anxietyLevel = avgAnxiety >= 70 ? 'high' : (avgAnxiety >= 40 ? 'medium' : 'low');
    const anxietyColor = anxietyLevel === 'high' ? '#ff4444' : (anxietyLevel === 'medium' ? '#ffaa00' : '#44aa44');
    
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <div class="category-info">
        <span class="category-name">${data.name}</span>
        <span class="category-anxiety" style="color: ${anxietyColor}">
          总焦虑: ${totalAnxiety} | 平均: ${avgAnxiety}
        </span>
      </div>
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
        // 保存滚动位置
        const container = document.getElementById('tabs-container');
        const scrollTop = container ? container.scrollTop : 0;
        
        const tabIds = data.tabs.map(t => t.id);
        await tabManager.closeTabs(tabIds);
        tabCache.clear();
        await loadTabs();
        
        // 恢复滚动位置
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop = scrollTop;
          });
        }
      }
    });
  });
}

// 按分组渲染
async function renderByGroup(container, tabs = currentTabs) {
  const grouped = await tabManager.groupByChromeGroup(tabs);
  container.innerHTML = '';
  
  // 先显示有分组的，再显示未分组的
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === 'ungrouped') return 1;
    if (b === 'ungrouped') return -1;
    return 0;
  });
  
  sortedGroups.forEach(([groupId, data]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group';
    
    // 获取分组颜色
    const groupColors = {
      blue: '#4285f4',
      red: '#ea4335',
      yellow: '#fbbc04',
      green: '#34a853',
      pink: '#f28b82',
      purple: '#a142f4',
      cyan: '#24c1e0',
      orange: '#ff9800',
      grey: '#9aa0a6'
    };
    const groupColor = groupColors[data.color] || groupColors.grey;
    
    // 计算总焦虑值
    const totalAnxiety = data.totalAnxiety || data.tabs.reduce((sum, tab) => sum + (tab.anxietyScore || 0), 0);
    const avgAnxiety = data.avgAnxiety || Math.round(totalAnxiety / data.tabs.length);
    const anxietyLevel = avgAnxiety >= 70 ? 'high' : (avgAnxiety >= 40 ? 'medium' : 'low');
    const anxietyColor = anxietyLevel === 'high' ? '#ff4444' : (anxietyLevel === 'medium' ? '#ffaa00' : '#44aa44');
    
    const header = document.createElement('div');
    header.className = 'category-header';
    header.style.borderLeft = `4px solid ${groupColor}`;
    header.innerHTML = `
      <div class="category-info">
        <span class="category-name" style="color: ${groupColor}">${data.name}</span>
        <span class="category-anxiety" style="color: ${anxietyColor}">
          总焦虑: ${totalAnxiety} | 平均: ${avgAnxiety}
        </span>
      </div>
      <div class="category-actions">
        <span class="category-count">${data.tabs.length}</span>
        <button class="close-category-btn" data-group-id="${groupId}">${i18n.t('closeGroup')}</button>
      </div>
    `;
    
    const tabsList = document.createElement('div');
    tabsList.className = 'tabs-list';
    
    data.tabs.forEach(tab => {
      tabsList.appendChild(createTabElement(tab));
    });
    
    groupDiv.appendChild(header);
    groupDiv.appendChild(tabsList);
    container.appendChild(groupDiv);
    
    // 添加关闭分组按钮事件
    header.querySelector('.close-category-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(i18n.t('confirmCloseGroup', { group: data.name, count: data.tabs.length }))) {
        // 保存滚动位置
        const container = document.getElementById('tabs-container');
        const scrollTop = container ? container.scrollTop : 0;
        
        const tabIds = data.tabs.map(t => t.id);
        await tabManager.closeTabs(tabIds);
        tabCache.clear();
        await loadTabs();
        
        // 恢复滚动位置
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop = scrollTop;
          });
        }
      }
    });
  });
}

// 按焦虑值渲染
function renderByAnxiety(container, tabs = currentTabs) {
  container.innerHTML = '';
  tabs.forEach(tab => {
    container.appendChild(createTabElement(tab));
  });
}

// 创建标签页元素
function createTabElement(tab) {
  const div = document.createElement('div');
  div.className = 'tab-item';
  div.dataset.tabId = tab.id;
  
  const isSelected = selectedTabs.has(tab.id);
  if (isSelected) {
    div.classList.add('selected');
  }
  if (isBatchMode) {
    div.classList.add('has-checkbox');
  }
  
  const checkboxHtml = isBatchMode ? `
    <input type="checkbox" class="tab-checkbox" data-tab-id="${tab.id}" ${isSelected ? 'checked' : ''}>
  ` : '';
  
  // 高亮搜索文本
  const titleText = tab.title || i18n.t('noTitle');
  const highlightedTitle = currentSearchPattern 
    ? highlightSearchText(titleText, currentSearchPattern.text, currentSearchPattern.useRegex, currentSearchPattern.caseSensitive)
    : titleText;
  
  // 标签页状态图标
  const statusIcons = [];
  if (tab.pinned) {
    statusIcons.push('<span class="tab-status-icon" title="' + i18n.t('tabPinned') + '">📌</span>');
  }
  if (tab.mutedInfo && tab.mutedInfo.muted) {
    statusIcons.push('<span class="tab-status-icon" title="' + i18n.t('tabMuted') + '">🔇</span>');
  }
  if (tab.audible) {
    statusIcons.push('<span class="tab-status-icon" title="' + i18n.t('tabAudio') + '">🔊</span>');
  }
  
  div.innerHTML = `
    ${checkboxHtml}
    <div class="tab-header">
      <img src="${tab.favIconUrl || 'icons/default.png'}" class="tab-icon" onerror="this.src='icons/default.png'">
      <div class="tab-info">
        <div class="tab-title" title="${titleText}">${highlightedTitle}</div>
        <div class="tab-meta">
          <span class="tab-category">${tab.categoryName}</span>
          ${statusIcons.join('')}
          <span class="anxiety-score" style="color: ${tab.anxietyLevel.color}">
            ${tab.anxietyScore} - ${tab.anxietyLevel.label}
          </span>
        </div>
      </div>
      ${!isBatchMode ? `
      <div class="tab-actions">
        <button class="tab-action-btn" data-action="rename" data-tab-id="${tab.id}" title="${i18n.t('tabRename')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="tab-action-btn" data-action="${tab.pinned ? 'unpin' : 'pin'}" data-tab-id="${tab.id}" title="${tab.pinned ? i18n.t('tabUnpin') : i18n.t('tabPin')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="17" x2="12" y2="22"></line>
            <path d="M5 17h14v-7.8a2 2 0 0 0-.601-1.45L16 3l-4-4-4 4-2.399 2.75A2 2 0 0 0 5 9.2V17z"></path>
          </svg>
        </button>
        ${tab.mutedInfo && tab.mutedInfo.muted ? `
        <button class="tab-action-btn" data-action="unmute" data-tab-id="${tab.id}" title="${i18n.t('tabUnmute')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
        ` : `
        <button class="tab-action-btn" data-action="mute" data-tab-id="${tab.id}" title="${i18n.t('tabMute')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        </button>
        `}
        <button class="close-btn" data-tab-id="${tab.id}" title="${i18n.t('close')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      ` : ''}
    </div>
    <div class="anxiety-bar-container">
      <div class="anxiety-bar" style="width: ${tab.anxietyScore}%; background-color: ${tab.anxietyLevel.color};"></div>
    </div>
  `;
  
  // 批量模式：复选框点击
  if (isBatchMode) {
    const checkbox = div.querySelector('.tab-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (checkbox.checked) {
          selectedTabs.add(tab.id);
        } else {
          selectedTabs.delete(tab.id);
        }
        div.classList.toggle('selected', checkbox.checked);
        updateBatchActionsBar();
      });
    }
    
    // 点击整个项切换选择
    div.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox' && !e.target.closest('.close-btn')) {
        const cb = div.querySelector('.tab-checkbox');
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      }
    });
  } else {
    // 正常模式：操作按钮
    const closeBtn = div.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });
    }
    
    // 标签页操作按钮
    div.querySelectorAll('.tab-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const tabId = parseInt(btn.dataset.tabId);
        
        try {
          switch (action) {
            case 'rename':
              const currentTitle = tab.customTitle || tab.title;
              const newName = prompt(i18n.t('tabRename') || '重命名标签页', currentTitle);
              if (newName !== null) {
                if (newName.trim() && newName.trim() !== currentTitle) {
                  // 发送消息到content script来修改标题
                  chrome.tabs.sendMessage(tabId, {
                    action: 'renameTab',
                    title: newName.trim(),
                    tabId: tabId
                  }, (response) => {
                    if (chrome.runtime.lastError) {
                      // 如果content script未注入，尝试直接保存到storage
                      chrome.storage.local.get(['customTabTitles'], (result) => {
                        const customTitles = result.customTabTitles || {};
                        customTitles[tabId] = newName.trim();
                    chrome.storage.local.set({ customTabTitles: customTitles }, () => {
                      tabCache.clear();
                      loadTabs();
                    });
                      });
                    } else if (response && response.success) {
                      tabCache.clear();
                      loadTabs();
                    } else {
                      toast.error('重命名失败');
                    }
                  });
                } else if (!newName.trim()) {
                  // 清空自定义标题，恢复原始标题
                  chrome.storage.local.get(['customTabTitles'], (result) => {
                    const customTitles = result.customTabTitles || {};
                    delete customTitles[tabId];
                    chrome.storage.local.set({ customTabTitles: customTitles }, () => {
                      tabCache.clear();
                      loadTabs();
                    });
                  });
                }
              }
              break;
            case 'pin':
              await chrome.tabs.update(tabId, { pinned: true });
              tabCache.clear();
              await loadTabs();
              break;
            case 'unpin':
              await chrome.tabs.update(tabId, { pinned: false });
              tabCache.clear();
              await loadTabs();
              break;
            case 'mute':
              await chrome.tabs.update(tabId, { muted: true });
              tabCache.clear();
              await loadTabs();
              break;
            case 'unmute':
              await chrome.tabs.update(tabId, { muted: false });
              tabCache.clear();
              await loadTabs();
              break;
          }
        } catch (error) {
          toast.error('操作失败');
        }
      });
    });
    
    // 点击切换到标签页
    div.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-actions') && !e.target.closest('.close-btn')) {
        chrome.tabs.update(tab.id, { active: true });
        window.close();
      }
    });
  }
  
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
  
  try {
    if (action === 'close') {
      if (confirm(i18n.t('confirmCloseTabs', { count: tabs.length }))) {
        await tabManager.closeTabs(tabIds);
        toast.success(i18n.t('tabsClosed', { count: tabs.length }));
        tabCache.clear();
        await loadTabs();
      }
    } else if (action === 'archive') {
      // 先保存会话，再关闭
      const sessionName = prompt(i18n.t('enterSessionName'));
      if (sessionName !== null) {
        await tabManager.saveSession(sessionName);
        if (confirm(i18n.t('confirmCloseAfterArchive', { count: tabs.length }))) {
          await tabManager.closeTabs(tabIds);
          tabCache.clear();
          await loadTabs();
        }
      }
    } else if (action === 'suspend') {
      // 暂存：保存会话并关闭
      const sessionName = prompt(i18n.t('enterSessionName'));
      if (sessionName !== null) {
        await tabManager.saveSession(sessionName);
        await tabManager.closeTabs(tabIds);
        tabCache.clear();
        await loadTabs();
      }
    }
  } catch (error) {
    toast.error(i18n.t('actionError') || '操作失败');
  }
}

// 关闭标签页
async function closeTab(tabId) {
  try {
    // 保存滚动位置到全局变量
    const container = document.getElementById('tabs-container');
    if (container) {
      savedScrollTop = container.scrollTop;
    }
    
    await tabManager.closeTabs(tabId);
    toast.success(i18n.t('tabClosed') || '标签页已关闭');
    
    // 直接更新数据，不调用 loadTabs() 避免显示加载状态
    // 清除缓存
    tabCache.clear();
    
    // 重新获取标签页数据
    currentTabs = await tabManager.getAllTabsWithInfo();
    
    // 更新建议和统计
    currentSuggestions = tabManager.getActionSuggestions(currentTabs);
    
    // 应用筛选并重新渲染
    applyFiltersAndSearch();
    renderTabs();
    renderSuggestions();
    updateStats();
    
    // 恢复滚动位置
    if (container && savedScrollTop > 0) {
      // 使用双重 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.scrollTop = savedScrollTop;
        });
      });
    }
  } catch (error) {
    toast.error(i18n.t('closeError') || '关闭标签页失败');
  }
}

// 设置事件监听
async function setupEventListeners() {
  // 视图模式切换
  document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // 保存滚动位置
      const container = document.getElementById('tabs-container');
      const scrollTop = container ? container.scrollTop : 0;
      
      renderTabs();
      
      // 恢复滚动位置
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = scrollTop;
        });
      }
    });
  });
  
  // 更多菜单按钮
  const moreBtn = document.getElementById('more-btn');
  const moreMenu = document.getElementById('more-menu');
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const isVisible = moreMenu.style.display === 'block';
      moreMenu.style.display = isVisible ? 'none' : 'block';
      // 关闭主题菜单（如果打开）
      if (themeMenu) themeMenu.classList.remove('show');
    });
    
    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
      if (!moreBtn.contains(e.target) && !moreMenu.contains(e.target)) {
        moreMenu.style.display = 'none';
      }
    });
  }
  
  // 查看归档按钮（在更多菜单中）
  const sessionsBtn = document.getElementById('sessions-btn');
  if (sessionsBtn) {
    sessionsBtn.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      showSessionsView();
    });
  }
  
  // 设置按钮（在更多菜单中）
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (moreMenu) moreMenu.style.display = 'none';
      showSettingsView();
    });
  }
  
  // 主题选择器按钮（在更多菜单中）- 使用hover显示二级菜单
  const themeBtn = document.getElementById('theme-btn');
  const themeMenu = document.getElementById('theme-menu');
  if (themeBtn && themeMenu) {
    // 确保主题菜单已渲染
    renderThemeMenu();
    
    let hideTimeout = null;
    let showTimeout = null;
    
    // 显示二级菜单的函数
    const showSubMenu = () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // 确保菜单已渲染
      renderThemeMenu();
      
      // 获取按钮位置
      const btnRect = themeBtn.getBoundingClientRect();
      const moreMenuRect = moreMenu ? moreMenu.getBoundingClientRect() : null;
      
      // 设置菜单的固定位置（在按钮左侧显示）
      themeMenu.style.position = 'fixed';
      themeMenu.style.top = `${btnRect.top}px`;
      themeMenu.style.right = `${window.innerWidth - btnRect.left + 5}px`; // 在按钮左侧显示
      themeMenu.style.left = 'auto';
      themeMenu.style.width = `${Math.max(150, btnRect.width)}px`;
      
      // 显示菜单
      themeMenu.classList.add('show');
    };
    
    // 隐藏二级菜单的函数
    const hideSubMenu = (delay = 0) => {
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      hideTimeout = setTimeout(() => {
        themeMenu.classList.remove('show');
        // 重置位置
        themeMenu.style.position = '';
        themeMenu.style.top = '';
        themeMenu.style.left = '';
        themeMenu.style.right = '';
        themeMenu.style.width = '';
        hideTimeout = null;
      }, delay);
    };
    
    // 鼠标进入按钮时延迟显示二级菜单
    themeBtn.addEventListener('mouseenter', () => {
      showTimeout = setTimeout(() => {
        showSubMenu();
      }, 200); // 200ms延迟显示，避免鼠标快速划过时闪烁
    });
    
    // 鼠标离开按钮时延迟隐藏菜单
    themeBtn.addEventListener('mouseleave', () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      hideSubMenu(150); // 150ms延迟，给用户时间移动到菜单
    });
    
    // 鼠标进入二级菜单时保持显示
    themeMenu.addEventListener('mouseenter', () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    });
    
    // 鼠标离开二级菜单时隐藏
    themeMenu.addEventListener('mouseleave', () => {
      hideSubMenu(0);
    });
  }
  
  // 语言切换按钮（在更多菜单中）
  const langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    langBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (moreMenu) moreMenu.style.display = 'none';
      const currentLang = i18n.getLanguage();
      const newLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
      await i18n.setLanguage(newLang);
      updateUIText();
      updateThemeSelector();
      await loadTabs();
      // 如果正在显示会话视图，重新渲染
      const sessionsView = document.getElementById('sessions-view');
      if (sessionsView && sessionsView.style.display !== 'none') {
        await renderSessions();
      }
    });
  }
  
  // 设置返回按钮
  const settingsBackBtn = document.getElementById('settings-back-btn');
  if (settingsBackBtn) {
    settingsBackBtn.addEventListener('click', hideSettingsView);
  }
  
  // 设置标签切换
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchSettingsTab(tabName);
    });
  });
  
  // 返回按钮
  document.getElementById('back-btn').addEventListener('click', hideSessionsView);
  
  // 导出会话按钮
  const exportSessionsBtn = document.getElementById('export-sessions-btn');
  if (exportSessionsBtn) {
    exportSessionsBtn.addEventListener('click', exportSessions);
  }
  
  // 导入会话按钮
  const importSessionsBtn = document.getElementById('import-sessions-btn');
  const importFileInput = document.getElementById('import-file-input');
  if (importSessionsBtn && importFileInput) {
    importSessionsBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    importFileInput.addEventListener('change', handleImportSessions);
  }
  
  // 会话搜索
  const sessionsSearchInput = document.getElementById('sessions-search-input');
  if (sessionsSearchInput) {
    sessionsSearchInput.addEventListener('input', debounce(() => {
      filterSessions();
    }, 300));
  }
  
  // 设置全局键盘快捷键
  setupKeyboardShortcuts();
  
  // 归档按钮
  document.getElementById('archive-btn').addEventListener('click', async () => {
    try {
      const sessionName = prompt(i18n.t('enterSessionName'));
      if (sessionName !== null) { // 用户没有取消
        await tabManager.saveSession(sessionName);
        tabCache.clear();
        toast.success(i18n.t('sessionSaved') || '已归档');
      }
    } catch (error) {
      toast.error(i18n.t('archiveError') || '归档失败');
    }
  });
  
  // 主题选择器按钮（在更多菜单中，已在上面处理）
  // 主题切换时更新显示
  const originalApplyTheme = themes.applyTheme;
  themes.applyTheme = function(themeName) {
    originalApplyTheme.call(this, themeName);
    updateThemeSelector();
  };
  
  // 批量模式按钮
  const batchModeBtn = document.getElementById('batch-mode-btn');
  if (batchModeBtn) {
    batchModeBtn.addEventListener('click', () => {
      toggleBatchMode();
    });
  }
  
  // 刷新按钮（带防抖）
  const debouncedLoadTabs = debounce(() => {
    tabCache.clear();
    loadTabs();
  }, 300);
  document.getElementById('refresh-btn').addEventListener('click', debouncedLoadTabs);
  
  // 搜索框
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const searchOptionsBtn = document.getElementById('search-options-btn');
  const searchOptionsMenu = document.getElementById('search-options-menu');
  
  // 加载搜索历史
  await loadSearchHistory();
  renderSearchHistory();
  
  if (searchInput) {
    const debouncedSearch = debounce(() => {
      applyFiltersAndSearch();
      renderTabs();
    }, 300);
    
    searchInput.addEventListener('input', (e) => {
      clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
      debouncedSearch();
    });
    
    // 清除搜索
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      currentSearchPattern = null;
      applyFiltersAndSearch();
      renderTabs();
    });
    
    // 搜索选项按钮
    if (searchOptionsBtn && searchOptionsMenu) {
      searchOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchOptionsMenu.style.display = searchOptionsMenu.style.display === 'none' ? 'block' : 'none';
      });
      
      // 点击外部关闭菜单
      document.addEventListener('click', (e) => {
        if (!searchOptionsBtn.contains(e.target) && !searchOptionsMenu.contains(e.target)) {
          searchOptionsMenu.style.display = 'none';
        }
      });
      
      // 搜索选项变化
      document.getElementById('use-regex')?.addEventListener('change', () => {
        applyFiltersAndSearch();
        renderTabs();
      });
      document.getElementById('case-sensitive')?.addEventListener('change', () => {
        applyFiltersAndSearch();
        renderTabs();
      });
    }
    
    // Ctrl/Cmd + K 聚焦搜索框
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }
  
  // 筛选器
  const anxietyFilter = document.getElementById('anxiety-filter');
  const categoryFilter = document.getElementById('category-filter');
  
  if (anxietyFilter) {
    anxietyFilter.addEventListener('change', () => {
      applyFiltersAndSearch();
      renderTabs();
    });
  }
  
  if (categoryFilter) {
    // 动态填充分类选项
    updateCategoryFilter();
    categoryFilter.addEventListener('change', () => {
      applyFiltersAndSearch();
      renderTabs();
    });
  }
  
  // 批量操作
  setupBatchOperations();
}

// 更新分类筛选器选项
function updateCategoryFilter() {
  const categoryFilter = document.getElementById('category-filter');
  if (!categoryFilter) return;
  
  const categories = new Set(currentTabs.map(t => t.category));
  const categoryNames = {};
  currentTabs.forEach(t => {
    if (!categoryNames[t.category]) {
      categoryNames[t.category] = t.categoryName;
    }
  });
  
  // 保留"全部分类"选项
  const allOption = categoryFilter.querySelector('option[value="all"]');
  categoryFilter.innerHTML = '';
  if (allOption) {
    categoryFilter.appendChild(allOption);
  }
  
  Array.from(categories).sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = categoryNames[category] || category;
    categoryFilter.appendChild(option);
  });
}

// 设置批量操作
function setupBatchOperations() {
  const batchBar = document.getElementById('batch-actions-bar');
  const batchClose = document.getElementById('batch-close');
  const batchArchive = document.getElementById('batch-archive');
  const batchCancel = document.getElementById('batch-cancel');
  
  // 进入批量模式（可以通过右键菜单或按钮触发）
  // 这里先添加一个快捷键：Ctrl/Cmd + B
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !isBatchMode) {
      e.preventDefault();
      toggleBatchMode();
    }
  });
  
  // 批量关闭
  if (batchClose) {
    batchClose.addEventListener('click', async () => {
      if (selectedTabs.size === 0) {
        toast.warning(i18n.t('noTabsSelected') || '请先选择标签页');
        return;
      }
      
      if (confirm(i18n.t('confirmCloseTabs', { count: selectedTabs.size }))) {
        try {
          // 保存滚动位置
          const container = document.getElementById('tabs-container');
          const scrollTop = container ? container.scrollTop : 0;
          
          await tabManager.closeTabs(Array.from(selectedTabs));
          toast.success(i18n.t('tabsClosed', { count: selectedTabs.size }));
          selectedTabs.clear();
          tabCache.clear();
          await loadTabs();
          toggleBatchMode();
          
          // 恢复滚动位置
          if (container) {
            requestAnimationFrame(() => {
              container.scrollTop = scrollTop;
            });
          }
        } catch (error) {
          toast.error(i18n.t('closeError') || '关闭失败');
        }
      }
    });
  }
  
  // 批量归档
  if (batchArchive) {
    batchArchive.addEventListener('click', async () => {
      if (selectedTabs.size === 0) {
        toast.warning(i18n.t('noTabsSelected') || '请先选择标签页');
        return;
      }
      
      const sessionName = prompt(i18n.t('enterSessionName'));
      if (sessionName !== null) {
        try {
          const selectedTabsArray = currentTabs.filter(t => selectedTabs.has(t.id));
          const session = {
            id: Date.now().toString(),
            name: sessionName || `Session ${new Date().toLocaleString()}`,
            timestamp: Date.now(),
            tabs: selectedTabsArray.map(t => ({
              url: t.url,
              title: t.title,
              favIconUrl: t.favIconUrl
            }))
          };
          
          // 保存滚动位置
          const container = document.getElementById('tabs-container');
          const scrollTop = container ? container.scrollTop : 0;
          
          chrome.storage.local.get(['sessions'], (result) => {
            const sessions = result.sessions || [];
            sessions.push(session);
            chrome.storage.local.set({ sessions }, () => {
              selectedTabs.clear();
              toggleBatchMode();
              
              // 恢复滚动位置
              if (container) {
                requestAnimationFrame(() => {
                  container.scrollTop = scrollTop;
                });
              }
            });
          });
        } catch (error) {
          toast.error(i18n.t('archiveError') || '归档失败');
        }
      }
    });
  }
  
  // 取消批量模式
  if (batchCancel) {
    batchCancel.addEventListener('click', () => {
      toggleBatchMode();
    });
  }
  
  // 全选按钮
  const selectAllBtn = document.getElementById('select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const container = document.getElementById('tabs-container');
      const checkboxes = container.querySelectorAll('.tab-checkbox');
      checkboxes.forEach(checkbox => {
        const tabId = parseInt(checkbox.dataset.tabId);
        if (!selectedTabs.has(tabId)) {
          selectedTabs.add(tabId);
          checkbox.checked = true;
          const tabElement = checkbox.closest('.tab-item');
          if (tabElement) {
            tabElement.classList.add('selected');
          }
        }
      });
      updateBatchActionsBar();
    });
  }
  
  // 取消全选按钮
  const deselectAllBtn = document.getElementById('deselect-all-btn');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      const container = document.getElementById('tabs-container');
      const checkboxes = container.querySelectorAll('.tab-checkbox');
      checkboxes.forEach(checkbox => {
        const tabId = parseInt(checkbox.dataset.tabId);
        selectedTabs.delete(tabId);
        checkbox.checked = false;
        const tabElement = checkbox.closest('.tab-item');
        if (tabElement) {
          tabElement.classList.remove('selected');
        }
      });
      updateBatchActionsBar();
    });
  }
}

// 切换批量模式
function toggleBatchMode() {
  isBatchMode = !isBatchMode;
  const batchBar = document.getElementById('batch-actions-bar');
  const batchModeBtn = document.getElementById('batch-mode-btn');
  
  // 保存滚动位置
  const container = document.getElementById('tabs-container');
  if (container) {
    savedScrollTop = container.scrollTop;
  }
  
  if (isBatchMode) {
    if (batchBar) {
      batchBar.style.display = 'flex';
    }
    selectedTabs.clear();
    if (batchModeBtn) {
      batchModeBtn.style.background = 'rgba(255,255,255,0.4)';
    }
    // 移除批量模式启用的提示，通过UI状态变化即可感知
  } else {
    if (batchBar) {
      batchBar.style.display = 'none';
    }
    selectedTabs.clear();
    if (batchModeBtn) {
      batchModeBtn.style.background = 'rgba(255,255,255,0.2)';
    }
  }
  
  // 立即重新渲染以显示/隐藏复选框
  renderTabs();
  updateBatchActionsBar();
  
  // 恢复滚动位置
  if (container && savedScrollTop > 0) {
    requestAnimationFrame(() => {
      container.scrollTop = savedScrollTop;
    });
  }
}

// 更新批量操作栏
function updateBatchActionsBar() {
  const batchCount = document.getElementById('batch-count');
  if (batchCount) {
    batchCount.textContent = i18n.t('selectedTabs', { count: selectedTabs.size }) || `已选择 ${selectedTabs.size} 个`;
  }
  
  const batchClose = document.getElementById('batch-close');
  const batchArchive = document.getElementById('batch-archive');
  if (batchClose) {
    batchClose.disabled = selectedTabs.size === 0;
  }
  if (batchArchive) {
    batchArchive.disabled = selectedTabs.size === 0;
  }
}

// 显示归档视图
async function showSessionsView() {
  document.getElementById('content').style.display = 'none';
  document.getElementById('sessions-view').style.display = 'block';
  const searchBar = document.querySelector('.sessions-search-bar');
  if (searchBar) {
    searchBar.style.display = 'block';
  }
  updateUIText(); // 更新UI文本
  allSessions = []; // 清除缓存
  await renderSessions();
}

// 隐藏归档视图
function hideSessionsView() {
  document.getElementById('sessions-view').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  const searchBar = document.querySelector('.sessions-search-bar');
  if (searchBar) {
    searchBar.style.display = 'none';
  }
  const searchInput = document.getElementById('sessions-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
}

// 渲染归档会话列表
async function renderSessions() {
  const sessions = await tabManager.getSessions();
  allSessions = sessions; // 保存所有会话用于搜索
  const container = document.getElementById('sessions-list');
  
  if (sessions.length === 0) {
    container.innerHTML = `<div class="empty-state">${i18n.t('noArchivedSessions')}</div>`;
    return;
  }
  
  container.innerHTML = '';
  
  // 按时间倒序排列
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  
  sessions.forEach(session => {
    const sessionDiv = createSessionElement(session);
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

// 导出会话
async function exportSessions() {
  try {
    const sessions = await tabManager.getSessions();
    if (sessions.length === 0) {
      toast.warning(i18n.t('noArchivedSessions') || '没有可导出的会话');
      return;
    }
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sessionCount: sessions.length,
      sessions: sessions
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tab-anxiety-sessions-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    // 导出成功不需要提示，文件已自动下载
  } catch (error) {
    console.error('Export error:', error);
    toast.error(i18n.t('exportError') || '导出失败');
  }
}

// 导入会话
async function handleImportSessions(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // 验证文件格式
    if (!importData.sessions || !Array.isArray(importData.sessions)) {
      toast.error(i18n.t('importFileInvalid') || '导入文件格式无效');
      return;
    }
    
    if (!confirm(i18n.t('confirmImport') || '导入将覆盖现有会话，确定继续吗？')) {
      return;
    }
    
    // 获取现有会话
    chrome.storage.local.get(['sessions'], (result) => {
      const existingSessions = result.sessions || [];
      const importedSessions = importData.sessions;
      
      // 合并会话（避免重复ID）
      const existingIds = new Set(existingSessions.map(s => s.id));
      const newSessions = importedSessions.filter(s => !existingIds.has(s.id));
      const mergedSessions = [...existingSessions, ...newSessions];
      
      chrome.storage.local.set({ sessions: mergedSessions }, () => {
        if (newSessions.length > 0) {
          toast.success(`已导入 ${newSessions.length} 个会话`);
        }
        renderSessions();
      });
    });
    
    // 重置文件输入
    event.target.value = '';
  } catch (error) {
    console.error('Import error:', error);
    toast.error(i18n.t('importError') || '导入失败');
  }
}

// 过滤会话（搜索功能）
let allSessions = [];
async function filterSessions() {
  const searchText = document.getElementById('sessions-search-input')?.value.trim().toLowerCase() || '';
  const container = document.getElementById('sessions-list');
  
  if (!allSessions.length) {
    allSessions = await tabManager.getSessions();
  }
  
  let filtered = allSessions;
  if (searchText) {
    filtered = allSessions.filter(session => {
      const name = (session.name || '').toLowerCase();
      const tabs = (session.tabs || []).map(t => (t.title || '').toLowerCase() + ' ' + (t.url || '').toLowerCase()).join(' ');
      return name.includes(searchText) || tabs.includes(searchText);
    });
  }
  
  // 重新渲染过滤后的会话
  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">${i18n.t('noResults') || '无结果'}</div>`;
    return;
  }
  
  filtered.sort((a, b) => b.timestamp - a.timestamp);
  filtered.forEach(session => {
    const sessionDiv = createSessionElement(session);
    container.appendChild(sessionDiv);
  });
}

// 创建会话元素（提取为独立函数以便复用）
function createSessionElement(session) {
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
      <button class="rename-btn" data-session-id="${session.id}">${i18n.t('renameSession')}</button>
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
  
  // 重命名会话按钮
  sessionDiv.querySelector('.rename-btn').addEventListener('click', async () => {
    const newName = prompt(i18n.t('renameSession') || '重命名会话', session.name);
    if (newName && newName.trim() && newName !== session.name) {
      await tabManager.renameSession(session.id, newName.trim());
      allSessions = []; // 清除缓存
      await renderSessions();
    }
  });
  
  // 删除会话按钮
  sessionDiv.querySelector('.delete-btn').addEventListener('click', async () => {
    if (confirm(i18n.t('confirmDeleteSession', { name: session.name }))) {
      await tabManager.deleteSession(session.id);
      allSessions = []; // 清除缓存
      await renderSessions();
    }
  });
  
  return sessionDiv;
}

// 设置键盘快捷键
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // 如果用户在输入框中，不处理快捷键（除了 Esc）
    const activeElement = document.activeElement;
    const isInput = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // Esc: 关闭弹窗/取消操作
    if (e.key === 'Escape') {
      // 如果批量模式开启，关闭批量模式
      if (isBatchMode) {
        toggleBatchMode();
        e.preventDefault();
        return;
      }
      // 如果在会话视图，返回主视图
      const sessionsView = document.getElementById('sessions-view');
      if (sessionsView && sessionsView.style.display !== 'none') {
        hideSessionsView();
        e.preventDefault();
        return;
      }
      // 关闭打开的菜单
      const moreMenu = document.getElementById('more-menu');
      if (moreMenu && moreMenu.style.display === 'block') {
        moreMenu.style.display = 'none';
        const moreBtn = document.getElementById('more-btn');
        if (moreBtn) {
          moreBtn.setAttribute('aria-expanded', 'false');
          moreBtn.focus();
        }
        e.preventDefault();
        return;
      }
    }
    
    // Tab 键导航增强
    if (e.key === 'Tab') {
      // 确保焦点可见
      document.body.classList.add('keyboard-navigation');
    }
    
    // 如果用户在输入框中，不处理其他快捷键
    if (isInput && e.key !== 'Escape' && e.key !== 'Tab') {
      return;
    }
    
    // Delete: 关闭选中的标签页（批量模式）
    if (e.key === 'Delete' && isBatchMode && selectedTabs.size > 0) {
      const batchClose = document.getElementById('batch-close');
      if (batchClose) {
        batchClose.click();
        e.preventDefault();
      }
      return;
    }
    
    // 数字键 1-3: 切换视图模式
    if (e.key >= '1' && e.key <= '3' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const viewModes = ['anxiety', 'category', 'group'];
      const index = parseInt(e.key) - 1;
      if (viewModes[index]) {
        const radio = document.querySelector(`input[name="view-mode"][value="${viewModes[index]}"]`);
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
          e.preventDefault();
        }
      }
      return;
    }
  });
  
  // 鼠标点击时移除键盘导航样式
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
}

// 更新 ARIA 属性
function updateAriaAttributes() {
  // 更新批量模式按钮
  const batchModeBtn = document.getElementById('batch-mode-btn');
  if (batchModeBtn) {
    batchModeBtn.setAttribute('aria-pressed', isBatchMode);
  }
  
  // 更新视图模式单选按钮
  document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', radio.checked);
  });
}

// 显示设置视图
async function showSettingsView() {
  document.getElementById('content').style.display = 'none';
  document.getElementById('sessions-view').style.display = 'none';
  document.getElementById('settings-view').style.display = 'block';
  updateUIText();
  await renderSettings();
}

// 隐藏设置视图
function hideSettingsView() {
  document.getElementById('settings-view').style.display = 'none';
  document.getElementById('content').style.display = 'block';
}

// 切换设置标签
function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabName}-settings`);
  });
  
  if (tabName === 'classification') {
    renderClassificationRules();
  } else if (tabName === 'anxiety') {
    renderAnxietyWeights();
  } else if (tabName === 'statistics') {
    renderStatisticsCharts();
  } else if (tabName === 'notifications') {
    renderNotificationSettings();
  } else if (tabName === 'accessibility') {
    renderAccessibilitySettings();
  }
  
  // 更新 ARIA 属性
  document.querySelectorAll('.settings-tab').forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.setAttribute('aria-selected', isActive);
    tab.classList.toggle('active', isActive);
  });
}

// 渲染设置页面
async function renderSettings() {
  await tabManager.classifier.loadCustomRules();
  renderClassificationRules();
  renderAnxietyWeights();
  renderStatisticsCharts();
  renderNotificationSettings();
}

// 渲染分类规则
async function renderClassificationRules() {
  const rulesList = document.getElementById('rules-list');
  if (!rulesList) return;
  
  const customRules = tabManager.classifier.getCustomRules();
  rulesList.innerHTML = '';
  
  // 显示默认分类
  const defaultCategories = tabManager.classifier.defaultCategories;
  Object.entries(defaultCategories).forEach(([key, category]) => {
    if (key === 'other') return;
    const ruleDiv = createRuleElement(key, category, false);
    rulesList.appendChild(ruleDiv);
  });
  
  // 显示自定义规则
  customRules.forEach(rule => {
    const ruleDiv = createRuleElement(rule.id, {
      name: rule.name,
      domains: rule.domains,
      keywords: rule.keywords,
      urlPattern: rule.urlPattern,
      priority: rule.priority
    }, true);
    rulesList.appendChild(ruleDiv);
  });
  
  // 添加规则按钮
  const addRuleBtn = document.getElementById('add-rule-btn');
  if (addRuleBtn) {
    addRuleBtn.onclick = () => showAddRuleDialog();
  }
}

// 创建规则元素
function createRuleElement(ruleId, rule, isCustom) {
  const div = document.createElement('div');
  div.className = 'rule-item';
  div.innerHTML = `
    <div class="rule-header">
      <h4>${rule.name}</h4>
      ${isCustom ? '<span class="rule-badge">自定义</span>' : '<span class="rule-badge default">默认</span>'}
      <span class="rule-priority">优先级: ${rule.priority || 0}</span>
    </div>
    <div class="rule-details">
      <div>域名: ${(rule.domains || []).join(', ') || '无'}</div>
      <div>关键词: ${(rule.keywords || []).join(', ') || '无'}</div>
      ${rule.urlPattern ? `<div>URL模式: ${rule.urlPattern}</div>` : ''}
    </div>
    ${isCustom ? `
      <div class="rule-actions">
        <button class="edit-rule-btn" data-rule-id="${ruleId}">${i18n.t('editRule')}</button>
        <button class="delete-rule-btn" data-rule-id="${ruleId}">${i18n.t('deleteRule')}</button>
      </div>
    ` : ''}
  `;
  
  if (isCustom) {
    div.querySelector('.edit-rule-btn').addEventListener('click', () => showEditRuleDialog(ruleId, rule));
    div.querySelector('.delete-rule-btn').addEventListener('click', () => deleteRule(ruleId));
  }
  
  return div;
}

// 显示添加规则对话框
function showAddRuleDialog(ruleId = null, rule = null) {
  const name = rule ? rule.name : prompt(i18n.t('ruleName') || '规则名称:');
  if (!name) return;
  
  const domains = rule ? (rule.domains || []).join(', ') : prompt(i18n.t('ruleDomains') || '域名（逗号分隔）:') || '';
  const keywords = rule ? (rule.keywords || []).join(', ') : prompt(i18n.t('ruleKeywords') || '关键词（逗号分隔）:') || '';
  const urlPattern = rule ? (rule.urlPattern || '') : prompt(i18n.t('ruleUrlPattern') || 'URL模式（正则表达式，可选）:') || '';
  const priority = rule ? (rule.priority || 0) : parseInt(prompt(i18n.t('rulePriority') || '优先级（数字，越大越优先）:') || '0');
  
  const newRule = {
    name: name.trim(),
    domains: domains.split(',').map(d => d.trim()).filter(d => d),
    keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
    urlPattern: urlPattern.trim() || null,
    priority: priority || 0
  };
  
  if (ruleId) {
    tabManager.classifier.updateCustomRule(ruleId, newRule).then(() => {
      renderClassificationRules();
      // 规则更新不需要提示
    });
  } else {
    tabManager.classifier.addCustomRule(newRule).then(() => {
      renderClassificationRules();
      // 规则添加不需要提示
    });
  }
}

// 显示编辑规则对话框
function showEditRuleDialog(ruleId, rule) {
  showAddRuleDialog(ruleId, rule);
}

// 删除规则
async function deleteRule(ruleId) {
  if (confirm(i18n.t('confirmDelete') || '确定要删除这个规则吗？')) {
    await tabManager.classifier.deleteCustomRule(ruleId);
    renderClassificationRules();
    // 规则删除不需要提示
  }
}

// 渲染焦虑权重
async function renderAnxietyWeights() {
  const weightsList = document.getElementById('weights-list');
  if (!weightsList) return;
  
  await tabManager.scorer.loadCustomWeights();
  const weights = tabManager.scorer.getWeights();
  
  weightsList.innerHTML = '';
  
  const weightConfigs = [
    { key: 'openDuration', label: i18n.t('weightOpenDuration') || '已打开时长' },
    { key: 'duplicateDomain', label: i18n.t('weightDuplicateDomain') || '重复域名' },
    { key: 'inactiveTime', label: i18n.t('weightInactiveTime') || '未聚焦时长' },
    { key: 'isSearchPage', label: i18n.t('weightIsSearchPage') || '搜索结果页' },
    { key: 'unreadArticle', label: i18n.t('weightUnreadArticle') || '未读文章' }
  ];
  
  weightConfigs.forEach(config => {
    const div = document.createElement('div');
    div.className = 'weight-item';
    div.innerHTML = `
      <label>${config.label}</label>
      <input type="range" min="0" max="1" step="0.05" value="${weights[config.key]}" 
             data-weight-key="${config.key}" class="weight-slider">
      <span class="weight-value">${(weights[config.key] * 100).toFixed(0)}%</span>
    `;
    
    const slider = div.querySelector('.weight-slider');
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      div.querySelector('.weight-value').textContent = (value * 100).toFixed(0) + '%';
      updateAnxietyWeights();
    });
    
    weightsList.appendChild(div);
  });
  
  // 预设按钮
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await tabManager.scorer.applyPreset(btn.dataset.preset);
      renderAnxietyWeights();
      updateAnxietyPreview();
      // 预设应用不需要提示
    });
  });
  
  // 重置按钮
  const resetBtn = document.createElement('button');
  resetBtn.className = 'action-btn';
  resetBtn.textContent = i18n.t('resetWeights') || '重置为默认值';
  resetBtn.addEventListener('click', async () => {
    await tabManager.scorer.resetWeights();
    renderAnxietyWeights();
    updateAnxietyPreview();
    // 重置不需要提示
  });
  weightsList.appendChild(resetBtn);
  
  updateAnxietyPreview();
}

// 更新焦虑权重
async function updateAnxietyWeights() {
  const sliders = document.querySelectorAll('.weight-slider');
  const weights = {};
  sliders.forEach(slider => {
    weights[slider.dataset.weightKey] = parseFloat(slider.value);
  });
  await tabManager.scorer.saveCustomWeights(weights);
  updateAnxietyPreview();
}

// 更新焦虑预览
function updateAnxietyPreview() {
  const preview = document.getElementById('anxiety-preview');
  if (!preview || currentTabs.length === 0) return;
  
  // 使用当前标签页重新计算焦虑值
  const sampleTab = currentTabs[0];
  const newScore = tabManager.scorer.calculateAnxietyScore(sampleTab, currentTabs);
  const level = tabManager.scorer.getAnxietyLevel(newScore);
  
  preview.innerHTML = `
    <h4>${i18n.t('previewAnxiety') || '预览焦虑值'}</h4>
    <div class="preview-score">
      <div class="preview-value" style="color: ${level.color}">${newScore}</div>
      <div class="preview-label">${level.label}</div>
    </div>
    <div class="preview-tab">示例: ${sampleTab.title || '无标题'}</div>
  `;
}

// 渲染统计图表
function renderStatisticsCharts() {
  const chartsContainer = document.getElementById('charts-container');
  if (!chartsContainer) return;
  
  chartsContainer.innerHTML = '';
  
  // 焦虑值分布
  const anxietyDistribution = calculateAnxietyDistribution();
  const anxietyChart = createAnxietyChart(anxietyDistribution);
  chartsContainer.appendChild(anxietyChart);
  
  // 分类分布
  const categoryDistribution = calculateCategoryDistribution();
  const categoryChart = createCategoryChart(categoryDistribution);
  chartsContainer.appendChild(categoryChart);
}

// 计算焦虑值分布
function calculateAnxietyDistribution() {
  const distribution = { high: 0, medium: 0, low: 0 };
  currentTabs.forEach(tab => {
    if (tab.anxietyScore >= 70) distribution.high++;
    else if (tab.anxietyScore >= 40) distribution.medium++;
    else distribution.low++;
  });
  return distribution;
}

// 创建焦虑值图表
function createAnxietyChart(distribution) {
  const div = document.createElement('div');
  div.className = 'chart-container';
  div.innerHTML = `
    <h4>焦虑值分布</h4>
    <div class="chart-bar">
      <div class="chart-bar-item">
        <div class="chart-bar-fill" style="width: ${(distribution.high / currentTabs.length * 100) || 0}%; background: #ff4444;"></div>
        <span>高焦虑 (≥70): ${distribution.high}</span>
      </div>
      <div class="chart-bar-item">
        <div class="chart-bar-fill" style="width: ${(distribution.medium / currentTabs.length * 100) || 0}%; background: #ffaa00;"></div>
        <span>中焦虑 (40-69): ${distribution.medium}</span>
      </div>
      <div class="chart-bar-item">
        <div class="chart-bar-fill" style="width: ${(distribution.low / currentTabs.length * 100) || 0}%; background: #44aa44;"></div>
        <span>低焦虑 (<40): ${distribution.low}</span>
      </div>
    </div>
  `;
  return div;
}

// 计算分类分布
function calculateCategoryDistribution() {
  const distribution = {};
  currentTabs.forEach(tab => {
    const category = tab.categoryName || '其他';
    distribution[category] = (distribution[category] || 0) + 1;
  });
  return distribution;
}

// 创建分类图表
function createCategoryChart(distribution) {
  const div = document.createElement('div');
  div.className = 'chart-container';
  const items = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  div.innerHTML = `
    <h4>分类分布</h4>
    <div class="chart-list">
      ${items.map(([category, count]) => `
        <div class="chart-list-item">
          <span class="chart-label">${category}</span>
          <div class="chart-bar-mini">
            <div class="chart-bar-fill" style="width: ${(count / currentTabs.length * 100) || 0}%;"></div>
          </div>
          <span class="chart-value">${count}</span>
        </div>
      `).join('')}
    </div>
  `;
  return div;
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

// 定期更新（使用节流）
const throttledUpdate = throttle(() => {
  if (document.getElementById('content').style.display !== 'none') {
    tabCache.clear();
    loadTabs();
  }
}, 30000); // 每30秒更新一次

setInterval(throttledUpdate, 30000);

// 渲染通知设置
async function renderNotificationSettings() {
  // 加载通知设置
  const settings = await loadNotificationSettings();
  
  // 设置各个开关
  const tabCountCheckbox = document.getElementById('notify-tab-count');
  const highAnxietyCheckbox = document.getElementById('notify-high-anxiety');
  const cleanupCheckbox = document.getElementById('notify-cleanup');
  const backupCheckbox = document.getElementById('notify-backup');
  
  if (tabCountCheckbox) {
    tabCountCheckbox.checked = settings.tabCount.enabled;
    document.getElementById('tab-count-threshold').value = settings.tabCount.threshold;
  }
  if (highAnxietyCheckbox) {
    highAnxietyCheckbox.checked = settings.highAnxiety.enabled;
    document.getElementById('high-anxiety-threshold').value = settings.highAnxiety.threshold;
  }
  if (cleanupCheckbox) {
    cleanupCheckbox.checked = settings.cleanup.enabled;
    document.getElementById('cleanup-interval').value = settings.cleanup.interval;
  }
  if (backupCheckbox) {
    backupCheckbox.checked = settings.backup.enabled;
    document.getElementById('backup-interval').value = settings.backup.interval;
  }
  
  // 显示/隐藏配置项
  updateNotificationConfigVisibility();
  
  // 绑定事件
  setupNotificationEventListeners();
}

// 加载通知设置
async function loadNotificationSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['notificationSettings'], (result) => {
      const defaultSettings = {
        tabCount: { enabled: false, threshold: 50 },
        highAnxiety: { enabled: false, threshold: 70 },
        cleanup: { enabled: false, interval: 7 },
        backup: { enabled: false, interval: 7 }
      };
      resolve(result.notificationSettings || defaultSettings);
    });
  });
}

// 保存通知设置
async function saveNotificationSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ notificationSettings: settings }, () => {
      // 通知 background.js 更新设置
      chrome.runtime.sendMessage({ action: 'updateNotificationSettings', settings });
      resolve();
    });
  });
}

// 更新配置项可见性
function updateNotificationConfigVisibility() {
  const tabCountCheckbox = document.getElementById('notify-tab-count');
  const highAnxietyCheckbox = document.getElementById('notify-high-anxiety');
  const cleanupCheckbox = document.getElementById('notify-cleanup');
  const backupCheckbox = document.getElementById('notify-backup');
  
  if (tabCountCheckbox) {
    document.getElementById('tab-count-config').style.display = tabCountCheckbox.checked ? 'block' : 'none';
  }
  if (highAnxietyCheckbox) {
    document.getElementById('high-anxiety-config').style.display = highAnxietyCheckbox.checked ? 'block' : 'none';
  }
  if (cleanupCheckbox) {
    document.getElementById('cleanup-config').style.display = cleanupCheckbox.checked ? 'block' : 'none';
  }
  if (backupCheckbox) {
    document.getElementById('backup-config').style.display = backupCheckbox.checked ? 'block' : 'none';
  }
}

// 设置通知事件监听器
function setupNotificationEventListeners() {
  // 标签页数量提醒
  const tabCountCheckbox = document.getElementById('notify-tab-count');
  const tabCountThreshold = document.getElementById('tab-count-threshold');
  
  if (tabCountCheckbox && tabCountThreshold) {
    tabCountCheckbox.addEventListener('change', async () => {
      updateNotificationConfigVisibility();
      const settings = await loadNotificationSettings();
      settings.tabCount.enabled = tabCountCheckbox.checked;
      await saveNotificationSettings(settings);
    });
    
    tabCountThreshold.addEventListener('change', async () => {
      const settings = await loadNotificationSettings();
      settings.tabCount.threshold = parseInt(tabCountThreshold.value);
      await saveNotificationSettings(settings);
    });
  }
  
  // 高焦虑提醒
  const highAnxietyCheckbox = document.getElementById('notify-high-anxiety');
  const highAnxietyThreshold = document.getElementById('high-anxiety-threshold');
  
  if (highAnxietyCheckbox && highAnxietyThreshold) {
    highAnxietyCheckbox.addEventListener('change', async () => {
      updateNotificationConfigVisibility();
      const settings = await loadNotificationSettings();
      settings.highAnxiety.enabled = highAnxietyCheckbox.checked;
      await saveNotificationSettings(settings);
    });
    
    highAnxietyThreshold.addEventListener('change', async () => {
      const settings = await loadNotificationSettings();
      settings.highAnxiety.threshold = parseInt(highAnxietyThreshold.value);
      await saveNotificationSettings(settings);
    });
  }
  
  // 定期清理提醒
  const cleanupCheckbox = document.getElementById('notify-cleanup');
  const cleanupInterval = document.getElementById('cleanup-interval');
  
  if (cleanupCheckbox && cleanupInterval) {
    cleanupCheckbox.addEventListener('change', async () => {
      updateNotificationConfigVisibility();
      const settings = await loadNotificationSettings();
      settings.cleanup.enabled = cleanupCheckbox.checked;
      await saveNotificationSettings(settings);
    });
    
    cleanupInterval.addEventListener('change', async () => {
      const settings = await loadNotificationSettings();
      settings.cleanup.interval = parseInt(cleanupInterval.value);
      await saveNotificationSettings(settings);
    });
  }
  
  // 会话备份提醒
  const backupCheckbox = document.getElementById('notify-backup');
  const backupInterval = document.getElementById('backup-interval');
  
  if (backupCheckbox && backupInterval) {
    backupCheckbox.addEventListener('change', async () => {
      updateNotificationConfigVisibility();
      const settings = await loadNotificationSettings();
      settings.backup.enabled = backupCheckbox.checked;
      await saveNotificationSettings(settings);
    });
    
    backupInterval.addEventListener('change', async () => {
      const settings = await loadNotificationSettings();
      settings.backup.interval = parseInt(backupInterval.value);
      await saveNotificationSettings(settings);
    });
  }
  
  // 测试通知按钮
  const testBtn = document.getElementById('test-notification-btn');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: i18n.t('testNotification') || '测试通知',
        message: i18n.t('notificationTabCountMessage', { count: 50 }) || '这是一条测试通知'
      });
    });
  }
}

// 渲染无障碍设置
async function renderAccessibilitySettings() {
  // 加载无障碍设置
  const settings = await loadAccessibilitySettings();
  
  // 设置字体大小
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeValue = document.getElementById('font-size-value');
  if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.value = settings.fontSize;
    fontSizeValue.textContent = settings.fontSize;
    applyFontSize(settings.fontSize);
    
    fontSizeSlider.addEventListener('input', (e) => {
      const size = parseInt(e.target.value);
      fontSizeValue.textContent = size;
      fontSizeSlider.setAttribute('aria-valuenow', size);
      applyFontSize(size);
      saveAccessibilitySettings({ ...settings, fontSize: size });
    });
  }
  
  // 设置高对比度模式
  const highContrastToggle = document.getElementById('high-contrast-toggle');
  if (highContrastToggle) {
    highContrastToggle.checked = settings.highContrast;
    applyHighContrast(settings.highContrast);
    
    highContrastToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      applyHighContrast(enabled);
      saveAccessibilitySettings({ ...settings, highContrast: enabled });
    });
  }
}

// 加载无障碍设置
async function loadAccessibilitySettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessibilitySettings'], (result) => {
      const defaultSettings = {
        fontSize: 14,
        highContrast: false
      };
      resolve(result.accessibilitySettings || defaultSettings);
    });
  });
}

// 保存无障碍设置
async function saveAccessibilitySettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ accessibilitySettings: settings }, () => {
      resolve();
    });
  });
}

// 应用字体大小
function applyFontSize(size) {
  document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  document.body.style.fontSize = `${size}px`;
}

// 应用高对比度模式
function applyHighContrast(enabled) {
  if (enabled) {
    document.body.classList.add('high-contrast');
    // 切换到高对比度主题
    themes.applyTheme('highContrast');
  } else {
    document.body.classList.remove('high-contrast');
    // 恢复之前的主题
    const currentTheme = themes.getCurrentTheme();
    if (currentTheme === 'highContrast') {
      themes.applyTheme('default');
    }
  }
}

// 初始化无障碍设置
async function initAccessibility() {
  const settings = await loadAccessibilitySettings();
  applyFontSize(settings.fontSize);
  applyHighContrast(settings.highContrast);
}

