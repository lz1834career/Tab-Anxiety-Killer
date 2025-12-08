// 标签页分类器 - 基于 URL 和 Title 规则

class TabClassifier {
  constructor() {
    this.categories = {
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

    // 检查每个分类
    for (const [key, category] of Object.entries(this.categories)) {
      if (key === 'other') continue;

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

