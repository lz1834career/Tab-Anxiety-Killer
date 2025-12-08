// 国际化语言配置

const i18n = {
  currentLang: 'zh-CN',
  
  // 语言包
  translations: {
    'zh-CN': {
      // 通用
      loading: '加载中...',
      close: '关闭',
      back: '返回',
      refresh: '刷新',
      archive: '归档',
      restore: '恢复',
      delete: '删除',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      noTitle: '无标题',
      
      // 标题和按钮
      viewArchives: '查看归档',
      archiveAllTabs: '归档当前所有标签',
      refreshTabs: '刷新',
      restoreSession: '恢复会话',
      deleteSession: '删除',
      closeCategory: '关闭分类',
      
      // 视图模式
      viewByAnxiety: '按焦虑值',
      viewByCategory: '按分类',
      
      // 统计信息
      totalTabs: '总标签',
      highAnxiety: '高焦虑',
      domains: '域名数',
      
      // 焦虑等级
      anxietyHigh: '高焦虑',
      anxietyMedium: '中焦虑',
      anxietyLow: '低焦虑',
      
      // 分类名称
      categoryShopping: '购物',
      categorySocial: '社交/消息',
      categoryWork: '工作',
      categoryLearning: '学习',
      categoryVideo: '视频娱乐',
      categorySearch: '搜索',
      categoryReading: '文章阅读',
      categoryOther: '其他',
      
      // 处理建议
      suggestionClose: '明显可关闭',
      suggestionArchive: '可收藏归档',
      suggestionSuspend: '建议暂存',
      suggestionKeep: '保持打开',
      actionProcess: '一键处理',
      
      // 归档视图
      archivedSessions: '已归档的会话',
      noArchivedSessions: '暂无归档的会话',
      sessionTabs: '个标签',
      moreTabs: '还有 {count} 个标签...',
      
      // 确认对话框
      confirmCloseTabs: '确定要关闭 {count} 个标签页吗？',
      confirmCloseCategory: '确定要关闭"{category}"分类下的 {count} 个标签页吗？',
      confirmDeleteSession: '确定要删除会话"{name}"吗？',
      confirmCloseAfterArchive: '已保存会话，是否关闭这 {count} 个标签页？',
      
      // 提示信息
      sessionSaved: '会话已保存！',
      sessionRestored: '已恢复 {count} 个标签页！',
      enterSessionName: '请输入会话名称（可选）:',
      
      // 日期格式
      dateFormat: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    },
    
    'en-US': {
      // Common
      loading: 'Loading...',
      close: 'Close',
      back: 'Back',
      refresh: 'Refresh',
      archive: 'Archive',
      restore: 'Restore',
      delete: 'Delete',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      noTitle: 'No Title',
      
      // Titles and buttons
      viewArchives: 'View Archives',
      archiveAllTabs: 'Archive All Tabs',
      refreshTabs: 'Refresh',
      restoreSession: 'Restore Session',
      deleteSession: 'Delete',
      closeCategory: 'Close Category',
      
      // View modes
      viewByAnxiety: 'By Anxiety',
      viewByCategory: 'By Category',
      
      // Statistics
      totalTabs: 'Total',
      highAnxiety: 'High Anxiety',
      domains: 'Domains',
      
      // Anxiety levels
      anxietyHigh: 'High Anxiety',
      anxietyMedium: 'Medium Anxiety',
      anxietyLow: 'Low Anxiety',
      
      // Category names
      categoryShopping: 'Shopping',
      categorySocial: 'Social/Messages',
      categoryWork: 'Work',
      categoryLearning: 'Learning',
      categoryVideo: 'Video/Entertainment',
      categorySearch: 'Search',
      categoryReading: 'Reading',
      categoryOther: 'Other',
      
      // Suggestions
      suggestionClose: 'Can Close',
      suggestionArchive: 'Can Archive',
      suggestionSuspend: 'Should Suspend',
      suggestionKeep: 'Keep Open',
      actionProcess: 'Process',
      
      // Archive view
      archivedSessions: 'Archived Sessions',
      noArchivedSessions: 'No archived sessions',
      sessionTabs: ' tabs',
      moreTabs: '{count} more tabs...',
      
      // Confirm dialogs
      confirmCloseTabs: 'Are you sure you want to close {count} tabs?',
      confirmCloseCategory: 'Are you sure you want to close {count} tabs in "{category}" category?',
      confirmDeleteSession: 'Are you sure you want to delete session "{name}"?',
      confirmCloseAfterArchive: 'Session saved. Close these {count} tabs?',
      
      // Messages
      sessionSaved: 'Session saved!',
      sessionRestored: 'Restored {count} tabs!',
      enterSessionName: 'Enter session name (optional):',
      
      // Date format
      dateFormat: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    }
  },
  
  /**
   * 获取翻译文本
   * @param {string} key - 翻译键
   * @param {Object} params - 参数对象
   * @returns {string} 翻译后的文本
   */
  t(key, params = {}) {
    const lang = this.currentLang;
    let text = this.translations[lang]?.[key] || key;
    
    // 替换参数
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }
    
    return text;
  },
  
  /**
   * 设置语言
   * @param {string} lang - 语言代码 ('zh-CN' 或 'en-US')
   */
  async setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      // 保存到存储
      chrome.storage.local.set({ language: lang });
      return true;
    }
    return false;
  },
  
  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getLanguage() {
    return this.currentLang;
  },
  
  /**
   * 初始化语言（从存储中加载）
   */
  async initLanguage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['language'], (result) => {
        const savedLang = result.language || 'zh-CN';
        this.setLanguage(savedLang).then(() => {
          resolve(savedLang);
        });
      });
    });
  }
};

