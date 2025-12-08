// 标签页管理器 - 核心功能

class TabManager {
  constructor() {
    this.classifier = new TabClassifier();
    this.scorer = new AnxietyScorer();
  }

  /**
   * 获取所有标签页并分类
   * @returns {Promise<Array>} 分类后的标签页数组
   */
  async getAllTabsWithInfo() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, async (tabs) => {
        const tabsWithInfo = await Promise.all(
          tabs.map(async (tab) => {
            const category = this.classifier.classify(tab);
            const anxietyScore = this.scorer.calculateAnxietyScore(tab, tabs);
            const anxietyLevel = this.scorer.getAnxietyLevel(anxietyScore);
            
            return {
              ...tab,
              category,
              categoryName: this.classifier.getCategoryName(category),
              anxietyScore,
              anxietyLevel,
              domain: this.scorer.getDomain(tab.url)
            };
          })
        );

        // 按焦虑值排序
        tabsWithInfo.sort((a, b) => b.anxietyScore - a.anxietyScore);
        resolve(tabsWithInfo);
      });
    });
  }

  /**
   * 获取处理建议
   * @param {Array} tabs - 标签页数组
   * @returns {Object} 处理建议
   */
  getActionSuggestions(tabs) {
    const suggestions = {
      close: [],           // 明显可关闭
      archive: [],         // 可收藏归档
      suspend: [],         // 建议暂存
      keep: []             // 保持打开
    };

    tabs.forEach(tab => {
      // 明显可关闭：搜索结果页、重复域名且高焦虑
      if (this.scorer.isSearchPage(tab.url)) {
        suggestions.close.push(tab);
      } else if (tab.anxietyScore >= 60 && this.hasDuplicateDomain(tab, tabs)) {
        suggestions.close.push(tab);
      }
      // 可收藏归档：长时间未访问的 docs、教程
      else if (tab.category === 'learning' && tab.anxietyScore >= 50 && !tab.active) {
        suggestions.archive.push(tab);
      }
      // 建议暂存：购物车、未完成文章
      else if (tab.category === 'shopping' || 
               (tab.category === 'reading' && tab.anxietyScore >= 40)) {
        suggestions.suspend.push(tab);
      }
      // 保持打开：active tabs
      else if (tab.active) {
        suggestions.keep.push(tab);
      }
      // 其他低焦虑的保持打开
      else if (tab.anxietyScore < 30) {
        suggestions.keep.push(tab);
      }
    });

    return suggestions;
  }

  /**
   * 检查是否有重复域名
   * @param {chrome.tabs.Tab} tab - 标签页
   * @param {Array<chrome.tabs.Tab>} allTabs - 所有标签页
   * @returns {boolean}
   */
  hasDuplicateDomain(tab, allTabs) {
    if (!tab.domain) return false;
    return allTabs.filter(t => t.domain === tab.domain && t.id !== tab.id).length > 0;
  }

  /**
   * 保存当前会话（归档）
   * @param {string} sessionName - 会话名称
   * @returns {Promise<Object>} 保存的会话信息
   */
  async saveSession(sessionName = null) {
    return new Promise((resolve) => {
      chrome.tabs.query({}, async (tabs) => {
        const session = {
          id: Date.now().toString(),
          name: sessionName || `Session ${new Date().toLocaleString('zh-CN')}`,
          timestamp: Date.now(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            favIconUrl: tab.favIconUrl
          }))
        };

        // 保存到 storage
        chrome.storage.local.get(['sessions'], (result) => {
          const sessions = result.sessions || [];
          sessions.push(session);
          chrome.storage.local.set({ sessions }, () => {
            resolve(session);
          });
        });
      });
    });
  }

  /**
   * 获取所有保存的会话
   * @returns {Promise<Array>} 会话数组
   */
  async getSessions() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sessions'], (result) => {
        resolve(result.sessions || []);
      });
    });
  }

  /**
   * 删除会话
   * @param {string} sessionId - 会话 ID
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sessions'], (result) => {
        const sessions = (result.sessions || []).filter(s => s.id !== sessionId);
        chrome.storage.local.set({ sessions }, () => {
          resolve();
        });
      });
    });
  }

  /**
   * 关闭标签页
   * @param {number|Array<number>} tabIds - 标签页 ID 或 ID 数组
   * @returns {Promise<void>}
   */
  async closeTabs(tabIds) {
    const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
    return new Promise((resolve) => {
      chrome.tabs.remove(ids, () => {
        resolve();
      });
    });
  }

  /**
   * 按分类分组标签页
   * @param {Array} tabs - 标签页数组
   * @returns {Object} 按分类分组的标签页
   */
  groupByCategory(tabs) {
    const grouped = {};
    tabs.forEach(tab => {
      if (!grouped[tab.category]) {
        grouped[tab.category] = {
          name: tab.categoryName,
          tabs: []
        };
      }
      grouped[tab.category].tabs.push(tab);
    });
    return grouped;
  }
}

