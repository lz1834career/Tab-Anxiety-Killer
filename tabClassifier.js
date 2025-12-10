// 标签页分类器 - 基于 URL 和 Title 规则

class TabClassifier {
  constructor() {
    this.defaultCategories = {
      shopping: {
        name: '购物',
        domains: ['taobao', 'tmall', 'amazon', 'jd', 'jd.com', 'ebay', 'alibaba'],
        keywords: ['cart', 'product', '购物车', '商品', '订单', 'checkout', 'buy']
      },
      social: {
        name: '社交/消息',
        domains: ['twitter.com', 'x.com', 'wechat', 'whatsapp', 'reddit.com', 'facebook.com', 'instagram.com', 'linkedin.com'],
        keywords: ['chat', 'message', '聊天', '消息']
      },
      work: {
        name: '工作',
        domains: ['github.com', 'gitlab.com', 'jira', 'confluence', 'notion.so', 'slack.com', 'trello.com', 'asana.com'],
        keywords: ['issue', 'task', 'project', 'work', '工作']
      },
      learning: {
        name: '学习',
        domains: ['docs.', 'stackoverflow.com', 'developer.mozilla.org', 'mdn', 'w3schools', 'leetcode', 'coursera', 'udemy'],
        keywords: ['tutorial', 'guide', 'documentation', '教程', '文档']
      },
      video: {
        name: '视频娱乐',
        domains: ['youtube.com', 'bilibili.com', 'vimeo.com', 'netflix.com', 'twitch.tv'],
        keywords: ['video', 'watch', 'play', '视频', '播放']
      },
      search: {
        name: '搜索',
        domains: ['google.com', 'bing.com', 'baidu.com', 'duckduckgo.com'],
        keywords: [],
        urlPattern: /[?&]q=/
      },
      reading: {
        name: '文章阅读',
        domains: ['medium.com', 'zhihu.com', 'blog', 'substack.com', 'dev.to'],
        keywords: ['article', 'post', 'read', '文章', '博客']
      },
      other: {
        name: '其他',
        domains: [],
        keywords: []
      }
    };
    this.categories = { ...this.defaultCategories };
    this.customRules = [];
    this.loadCustomRules();
  }

  /**
   * 从存储加载自定义规则
   */
  async loadCustomRules() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customClassificationRules'], (result) => {
        if (result.customClassificationRules) {
          this.customRules = result.customClassificationRules;
          // 合并自定义规则到分类中
          this.customRules.forEach(rule => {
            if (!this.categories[rule.id]) {
              this.categories[rule.id] = {
                name: rule.name,
                domains: rule.domains || [],
                keywords: rule.keywords || [],
                urlPattern: rule.urlPattern ? new RegExp(rule.urlPattern) : null,
                priority: rule.priority || 0,
                isCustom: true
              };
            }
          });
        }
        resolve();
      });
    });
  }

  /**
   * 保存自定义规则
   */
  async saveCustomRules() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ customClassificationRules: this.customRules }, () => {
        resolve();
      });
    });
  }

  /**
   * 添加自定义规则
   */
  async addCustomRule(rule) {
    const ruleId = rule.id || `custom_${Date.now()}`;
    const newRule = {
      id: ruleId,
      name: rule.name,
      domains: rule.domains || [],
      keywords: rule.keywords || [],
      urlPattern: rule.urlPattern || null,
      priority: rule.priority || 0
    };
    this.customRules.push(newRule);
    this.categories[ruleId] = {
      name: newRule.name,
      domains: newRule.domains,
      keywords: newRule.keywords,
      urlPattern: newRule.urlPattern ? new RegExp(newRule.urlPattern) : null,
      priority: newRule.priority,
      isCustom: true
    };
    await this.saveCustomRules();
    return newRule;
  }

  /**
   * 更新自定义规则
   */
  async updateCustomRule(ruleId, rule) {
    const index = this.customRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.customRules[index] = { ...this.customRules[index], ...rule };
      if (this.categories[ruleId]) {
        this.categories[ruleId] = {
          ...this.categories[ruleId],
          name: rule.name || this.categories[ruleId].name,
          domains: rule.domains || this.categories[ruleId].domains,
          keywords: rule.keywords || this.categories[ruleId].keywords,
          urlPattern: rule.urlPattern ? new RegExp(rule.urlPattern) : this.categories[ruleId].urlPattern,
          priority: rule.priority !== undefined ? rule.priority : this.categories[ruleId].priority
        };
      }
      await this.saveCustomRules();
    }
  }

  /**
   * 删除自定义规则
   */
  async deleteCustomRule(ruleId) {
    this.customRules = this.customRules.filter(r => r.id !== ruleId);
    delete this.categories[ruleId];
    await this.saveCustomRules();
  }

  /**
   * 获取自定义规则
   */
  getCustomRules() {
    return this.customRules;
  }

  /**
   * 分类单个标签页
   * @param {chrome.tabs.Tab} tab - 标签页对象
   * @returns {string} 分类名称
   */
  classify(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return 'other';
    }

    const url = new URL(tab.url);
    const hostname = url.hostname.toLowerCase();
    const title = (tab.title || '').toLowerCase();
    const urlLower = url.href.toLowerCase();

    // 按优先级排序（优先级高的先检查）
    const sortedCategories = Object.entries(this.categories)
      .filter(([key]) => key !== 'other')
      .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0));

    // 检查每个分类
    for (const [key, category] of sortedCategories) {

      // 检查域名匹配
      const domainMatch = category.domains.some(domain => 
        hostname.includes(domain.toLowerCase())
      );

      // 检查关键词匹配
      const keywordMatch = category.keywords.some(keyword => 
        title.includes(keyword.toLowerCase()) || urlLower.includes(keyword.toLowerCase())
      );

      // 检查 URL 模式（如搜索页）
      const patternMatch = category.urlPattern ? category.urlPattern.test(url.href) : false;

      if (domainMatch || keywordMatch || patternMatch) {
        return key;
      }
    }

    return 'other';
  }

  /**
   * 获取分类显示名称
   * @param {string} categoryKey - 分类键
   * @returns {string} 显示名称
   */
  getCategoryName(categoryKey) {
    if (typeof i18n !== 'undefined') {
      const keyMap = {
        shopping: 'categoryShopping',
        social: 'categorySocial',
        work: 'categoryWork',
        learning: 'categoryLearning',
        video: 'categoryVideo',
        search: 'categorySearch',
        reading: 'categoryReading',
        other: 'categoryOther'
      };
      return i18n.t(keyMap[categoryKey] || 'categoryOther');
    }
    return this.categories[categoryKey]?.name || '其他';
  }

  /**
   * 获取所有分类
   * @returns {Object} 所有分类
   */
  getAllCategories() {
    return this.categories;
  }
}

