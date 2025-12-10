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
    // 确保加载自定义规则和权重
    await this.classifier.loadCustomRules();
    await this.scorer.loadCustomWeights();
    
    return new Promise((resolve) => {
      chrome.tabs.query({}, async (tabs) => {
        // 获取所有分组信息
        const groupsMap = await this.getGroupsMap();
        
        // 获取自定义标题
        const customTitles = await new Promise((resolve) => {
          chrome.storage.local.get(['customTabTitles'], (result) => {
            resolve(result.customTabTitles || {});
          });
        });
        
        const tabsWithInfo = await Promise.all(
          tabs.map(async (tab) => {
            const category = this.classifier.classify(tab);
            const anxietyScore = this.scorer.calculateAnxietyScore(tab, tabs);
            const anxietyLevel = this.scorer.getAnxietyLevel(anxietyScore);
            
            // 获取分组信息 - 确保正确处理 groupId
            const tabGroupId = (tab.groupId !== undefined && tab.groupId !== null && tab.groupId !== -1) 
              ? tab.groupId 
              : null;
            
            const groupInfo = tabGroupId && groupsMap[tabGroupId] 
              ? groupsMap[tabGroupId] 
              : null;
            
            // 使用自定义标题（如果存在）
            const customTitle = customTitles[tab.id];
            const displayTitle = customTitle || tab.title;
            
            return {
              ...tab,
              title: displayTitle, // 使用自定义标题或原始标题
              originalTitle: tab.title, // 保存原始标题
              customTitle: customTitle, // 保存自定义标题（如果有）
              category,
              categoryName: this.classifier.getCategoryName(category),
              anxietyScore,
              anxietyLevel,
              domain: this.scorer.getDomain(tab.url),
              groupId: tabGroupId || -1,
              groupInfo: groupInfo
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
   * 获取所有分组信息映射
   * @returns {Promise<Object>} 分组ID到分组信息的映射
   */
  async getGroupsMap() {
    return new Promise((resolve) => {
      if (chrome.tabGroups && chrome.tabGroups.query) {
        chrome.tabGroups.query({}, (groups) => {
          if (chrome.runtime.lastError) {
            // 静默处理错误，避免影响用户体验
            resolve({});
            return;
          }
          
          const groupsMap = {};
          if (groups && Array.isArray(groups)) {
            groups.forEach(group => {
              if (group && group.id !== undefined) {
                groupsMap[group.id] = {
                  id: group.id,
                  title: group.title || '',
                  color: group.color || 'grey',
                  collapsed: group.collapsed || false
                };
              }
            });
          }
          resolve(groupsMap);
        });
      } else {
        // API 不可用时返回空对象
        resolve({});
      }
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
   * 重命名会话
   * @param {string} sessionId - 会话 ID
   * @param {string} newName - 新名称
   * @returns {Promise<void>}
   */
  async renameSession(sessionId, newName) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sessions'], (result) => {
        const sessions = result.sessions || [];
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          session.name = newName;
          chrome.storage.local.set({ sessions }, () => {
            resolve();
          });
        } else {
          resolve();
        }
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
          tabs: [],
          totalAnxiety: 0,
          avgAnxiety: 0
        };
      }
      grouped[tab.category].tabs.push(tab);
    });
    
    // 计算每个分类的总焦虑值和平均焦虑值
    Object.keys(grouped).forEach(category => {
      const group = grouped[category];
      if (group.tabs.length > 0) {
        group.totalAnxiety = group.tabs.reduce((sum, tab) => sum + (tab.anxietyScore || 0), 0);
        group.avgAnxiety = Math.round(group.totalAnxiety / group.tabs.length);
      }
    });
    
    return grouped;
  }

  /**
   * 按Chrome分组分组标签页
   * @param {Array} tabs - 标签页数组
   * @returns {Promise<Object>} 按分组分组的标签页
   */
  async groupByChromeGroup(tabs) {
    // 重新获取分组信息以确保最新
    const groupsMap = await this.getGroupsMap();
    
    const grouped = {};
    tabs.forEach(tab => {
      // 检查 tab.groupId，可能是数字或 -1
      const groupId = (tab.groupId !== undefined && tab.groupId !== null && tab.groupId !== -1) 
        ? tab.groupId 
        : 'ungrouped';
      
      if (!grouped[groupId]) {
        if (groupId === 'ungrouped') {
          grouped[groupId] = {
            id: 'ungrouped',
            name: typeof i18n !== 'undefined' ? i18n.t('noGroup') : '未分组',
            color: 'grey',
            tabs: [],
            totalAnxiety: 0,
            avgAnxiety: 0
          };
        } else {
          // 优先使用 tab 中已有的 groupInfo，否则从 groupsMap 获取
          const groupInfo = tab.groupInfo || groupsMap[groupId];
          
          if (groupInfo && groupInfo.title) {
            // 如果分组有标题，使用标题
            const groupName = groupInfo.title.trim() || `Group ${groupId}`;
            
            grouped[groupId] = {
              id: groupId,
              name: groupName,
              color: groupInfo.color || 'grey',
              tabs: [],
              totalAnxiety: 0,
              avgAnxiety: 0
            };
          } else if (groupInfo) {
            // 有分组信息但没有标题，使用默认名称
            grouped[groupId] = {
              id: groupId,
              name: `Group ${groupId}`,
              color: groupInfo.color || 'grey',
              tabs: [],
              totalAnxiety: 0,
              avgAnxiety: 0
            };
          } else {
            // 如果找不到分组信息，尝试直接从 Chrome API 获取单个分组
            // 作为后备方案，使用默认名称
            grouped[groupId] = {
              id: groupId,
              name: `Group ${groupId}`,
              color: 'grey',
              tabs: [],
              totalAnxiety: 0,
              avgAnxiety: 0
            };
            
            // 尝试获取单个分组信息
            if (chrome.tabGroups && chrome.tabGroups.get) {
              chrome.tabGroups.get(groupId, (group) => {
                if (!chrome.runtime.lastError && group && group.title) {
                  // 更新分组名称
                  grouped[groupId].name = group.title.trim() || `Group ${groupId}`;
                  grouped[groupId].color = group.color || 'grey';
                }
              });
            }
          }
        }
      }
      grouped[groupId].tabs.push(tab);
    });
    
    // 计算每个分组的总焦虑值和平均焦虑值
    Object.keys(grouped).forEach(groupId => {
      const group = grouped[groupId];
      if (group.tabs.length > 0) {
        group.totalAnxiety = group.tabs.reduce((sum, tab) => sum + (tab.anxietyScore || 0), 0);
        group.avgAnxiety = Math.round(group.totalAnxiety / group.tabs.length);
      }
    });
    
    return grouped;
  }
}

