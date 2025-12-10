// 焦虑值评分器

class AnxietyScorer {
  constructor() {
    // 默认权重配置
    this.defaultWeights = {
      openDuration: 0.3,        // 已打开时长权重
      duplicateDomain: 0.25,    // 重复域名权重
      inactiveTime: 0.2,        // 未聚焦时长权重
      isSearchPage: 0.15,       // 搜索结果页权重
      unreadArticle: 0.1        // 未读文章权重
    };
    
    // 权重配置
    this.weights = { ...this.defaultWeights };

    // 阈值配置
    this.thresholds = {
      longOpenDuration: 2 * 60 * 60 * 1000,  // 2小时（毫秒）
      inactiveTime: 30 * 60 * 1000,          // 30分钟未聚焦
      unreadScrollThreshold: 300             // 300px 滚动阈值
    };
    
    this.loadCustomWeights();
  }

  /**
   * 从存储加载自定义权重
   */
  async loadCustomWeights() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customAnxietyWeights'], (result) => {
        if (result.customAnxietyWeights) {
          this.weights = { ...this.defaultWeights, ...result.customAnxietyWeights };
        }
        resolve();
      });
    });
  }

  /**
   * 保存自定义权重
   */
  async saveCustomWeights(weights) {
    this.weights = { ...this.defaultWeights, ...weights };
    return new Promise((resolve) => {
      chrome.storage.local.set({ customAnxietyWeights: weights }, () => {
        resolve();
      });
    });
  }

  /**
   * 获取当前权重
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * 重置为默认权重
   */
  async resetWeights() {
    this.weights = { ...this.defaultWeights };
    return new Promise((resolve) => {
      chrome.storage.local.remove(['customAnxietyWeights'], () => {
        resolve();
      });
    });
  }

  /**
   * 应用预设权重
   */
  async applyPreset(preset) {
    let weights;
    switch (preset) {
      case 'aggressive':
        weights = {
          openDuration: 0.4,
          duplicateDomain: 0.3,
          inactiveTime: 0.2,
          isSearchPage: 0.1,
          unreadArticle: 0.0
        };
        break;
      case 'conservative':
        weights = {
          openDuration: 0.2,
          duplicateDomain: 0.2,
          inactiveTime: 0.15,
          isSearchPage: 0.2,
          unreadArticle: 0.25
        };
        break;
      default:
        weights = { ...this.defaultWeights };
    }
    await this.saveCustomWeights(weights);
  }

  /**
   * 计算标签页的焦虑值
   * @param {chrome.tabs.Tab} tab - 标签页对象
   * @param {Array<chrome.tabs.Tab>} allTabs - 所有标签页
   * @param {Object} tabStates - 标签页状态（如滚动位置等）
   * @returns {number} 焦虑值（0-100）
   */
  calculateAnxietyScore(tab, allTabs, tabStates = {}) {
    let score = 0;
    const now = Date.now();

    // 1. 已打开时长评分
    const openDuration = now - (tab.lastAccessed || tab.openerTabId ? now : tab.lastAccessed);
    if (openDuration > this.thresholds.longOpenDuration) {
      const hours = openDuration / (60 * 60 * 1000);
      score += Math.min(hours / 10 * 100, 30) * this.weights.openDuration;
    }

    // 2. 重复域名评分
    const domain = this.getDomain(tab.url);
    if (domain) {
      const duplicateCount = allTabs.filter(t => 
        this.getDomain(t.url) === domain && t.id !== tab.id
      ).length;
      if (duplicateCount > 0) {
        score += Math.min(duplicateCount * 10, 25) * this.weights.duplicateDomain;
      }
    }

    // 3. 未聚焦时长评分
    if (!tab.active) {
      const inactiveTime = now - (tab.lastAccessed || now);
      if (inactiveTime > this.thresholds.inactiveTime) {
        const minutes = inactiveTime / (60 * 1000);
        score += Math.min(minutes / 60 * 100, 20) * this.weights.inactiveTime;
      }
    }

    // 4. 搜索结果页评分
    if (this.isSearchPage(tab.url)) {
      score += 15 * this.weights.isSearchPage;
    }

    // 5. 未读文章评分（需要 content script 支持）
    const tabState = tabStates[tab.id];
    if (tabState && tabState.scrollTop !== undefined) {
      if (tabState.scrollTop < this.thresholds.unreadScrollThreshold) {
        score += 10 * this.weights.unreadArticle;
      }
    }

    // 归一化到 0-100
    return Math.min(Math.round(score), 100);
  }

  /**
   * 获取域名
   * @param {string} url - URL 字符串
   * @returns {string|null} 域名
   */
  getDomain(url) {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return null;
    }
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * 判断是否为搜索结果页
   * @param {string} url - URL 字符串
   * @returns {boolean}
   */
  isSearchPage(url) {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.has('q') || 
             urlObj.searchParams.has('query') ||
             urlObj.searchParams.has('search');
    } catch {
      return false;
    }
  }

  /**
   * 获取焦虑等级
   * @param {number} score - 焦虑值
   * @returns {Object} 等级信息
   */
  getAnxietyLevel(score) {
    if (score >= 70) {
      const label = typeof i18n !== 'undefined' ? i18n.t('anxietyHigh') : '高焦虑';
      return { level: 'high', label, color: '#ff4444' };
    } else if (score >= 40) {
      const label = typeof i18n !== 'undefined' ? i18n.t('anxietyMedium') : '中焦虑';
      return { level: 'medium', label, color: '#ffaa00' };
    } else {
      const label = typeof i18n !== 'undefined' ? i18n.t('anxietyLow') : '低焦虑';
      return { level: 'low', label, color: '#44aa44' };
    }
  }
}

