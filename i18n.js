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
      viewByGroup: '按分组',
      
      // 分组相关
      noGroup: '未分组',
      closeGroup: '关闭分组',
      groupTabs: '个标签',
      
      // 主题相关
      switchTheme: '切换风格',
      themeDefault: '默认',
      themeDark: '暗色',
      themeLight: '浅色',
      themeColorful: '彩色',
      
      // 搜索和筛选
      searchPlaceholder: '搜索标签页...',
      useRegex: '正则表达式',
      caseSensitive: '区分大小写',
      searchHistory: '搜索历史',
      clearHistory: '清除历史',
      tabRename: '重命名标签页',
      tabPin: '固定标签页',
      tabUnpin: '取消固定',
      tabUnpinned: '标签页已取消固定',
      tabMute: '静音',
      tabUnmute: '取消静音',
      tabUnmuted: '标签页已取消静音',
      tabAudio: '音频播放中',
      tabPinned: '已固定',
      tabMuted: '已静音',
      filterAll: '全部焦虑值',
      filterHigh: '高焦虑 (≥70)',
      filterMedium: '中焦虑 (40-69)',
      filterLow: '低焦虑 (<40)',
      filterAllCategories: '全部分类',
      
      // 批量操作
      selected: '已选择',
      batchClose: '批量关闭',
      batchArchive: '批量归档',
      selectAll: '全选',
      deselectAll: '取消全选',
      noResults: '没有找到匹配的标签页',
      
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
      confirmCloseGroup: '确定要关闭"{group}"分组下的 {count} 个标签页吗？',
      confirmDeleteSession: '确定要删除会话"{name}"吗？',
      confirmDelete: '确定要删除吗？',
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
      },
      
      // 导出/导入
      exportSessions: '导出会话',
      importSessions: '导入会话',
      exportAll: '导出全部',
      exportSelected: '导出选中',
      exportSuccess: '导出成功！',
      exportError: '导出失败',
      importSuccess: '导入成功！导入了 {count} 个会话',
      importError: '导入失败',
      importFileInvalid: '导入文件格式无效',
      confirmImport: '导入将覆盖现有会话，确定继续吗？',
      renameSession: '重命名会话',
      sessionName: '会话名称',
      sessionTags: '标签',
      sessionSearch: '搜索会话...',
      mergeSessions: '合并会话',
      selectSessionsToMerge: '请选择要合并的会话',
      mergedSessionName: '合并会话',
      
      // 键盘快捷键
      shortcuts: '快捷键',
      shortcutSearch: 'Ctrl/Cmd + K: 搜索',
      shortcutBatch: 'Ctrl/Cmd + B: 批量模式',
      shortcutDelete: 'Delete: 关闭选中',
      shortcutView1: '1: 按焦虑值',
      shortcutView2: '2: 按分类',
      shortcutView3: '3: 按分组',
      shortcutEscape: 'Esc: 关闭/取消',
      
      // 设置
      settings: '设置',
      customClassificationRules: '自定义分类规则',
      customAnxietyWeights: '自定义焦虑评分权重',
      statisticsCharts: '统计图表',
      addRule: '添加规则',
      editRule: '编辑规则',
      deleteRule: '删除规则',
      ruleName: '规则名称',
      rulePriority: '优先级',
      ruleDomains: '域名（逗号分隔）',
      ruleKeywords: '关键词（逗号分隔）',
      ruleUrlPattern: 'URL 模式（正则表达式）',
      saveRule: '保存规则',
      cancel: '取消',
      presetDefault: '默认',
      presetAggressive: '激进清理',
      presetConservative: '保守清理',
      weightOpenDuration: '已打开时长',
      weightDuplicateDomain: '重复域名',
      weightInactiveTime: '未聚焦时长',
      weightIsSearchPage: '搜索结果页',
      weightUnreadArticle: '未读文章',
      previewAnxiety: '预览焦虑值',
      resetWeights: '重置为默认值',
      
      // 通知和提醒
      notificationsAndReminders: '通知和提醒',
      tabCountReminder: '标签页数量提醒',
      tabCountReminderDesc: '当标签页数量超过阈值时提醒',
      highAnxietyReminder: '高焦虑标签页提醒',
      highAnxietyReminderDesc: '当存在高焦虑值标签页时提醒',
      periodicCleanupReminder: '定期清理提醒',
      periodicCleanupReminderDesc: '定期提醒清理标签页',
      sessionBackupReminder: '会话备份提醒',
      sessionBackupReminderDesc: '定期提醒备份会话数据',
      threshold: '阈值',
      tabs: '个标签页',
      anxietyThreshold: '焦虑值阈值',
      points: '分',
      reminderInterval: '提醒间隔',
      daily: '每天',
      every3Days: '每3天',
      weekly: '每周',
      monthly: '每月',
      every2Weeks: '每2周',
      testNotification: '测试通知',
      notificationTabCountTitle: '标签页过多',
      notificationTabCountMessage: '您当前打开了 {count} 个标签页，建议关闭一些。',
      notificationHighAnxietyTitle: '高焦虑标签页',
      notificationHighAnxietyMessage: '您有 {count} 个高焦虑标签页（≥{threshold}分）。',
      notificationCleanupTitle: '该清理了',
      notificationCleanupMessage: '距离上次清理已经有一段时间了，建议整理一下标签页。',
      notificationBackupTitle: '备份提醒',
      notificationBackupMessage: '别忘了备份您的会话数据。'
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
      viewByGroup: 'By Group',
      
      // Group related
      noGroup: 'Ungrouped',
      closeGroup: 'Close Group',
      groupTabs: ' tabs',
      
      // Theme related
      switchTheme: 'Switch Theme',
      switchLanguage: 'Switch Language',
      themeDefault: 'Default',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeColorful: 'Colorful',
      
      // Search and filter
      searchPlaceholder: 'Search tabs...',
      useRegex: 'Regular Expression',
      caseSensitive: 'Case Sensitive',
      searchHistory: 'Search History',
      clearHistory: 'Clear History',
      tabRename: 'Rename Tab',
      tabPin: 'Pin Tab',
      tabUnpin: 'Unpin Tab',
      tabUnpinned: 'Tab unpinned',
      tabMute: 'Mute Tab',
      tabUnmute: 'Unmute Tab',
      tabUnmuted: 'Tab unmuted',
      tabAudio: 'Audio Playing',
      tabPinned: 'Pinned',
      tabMuted: 'Muted',
      filterAll: 'All Anxiety',
      filterHigh: 'High (≥70)',
      filterMedium: 'Medium (40-69)',
      filterLow: 'Low (<40)',
      filterAllCategories: 'All Categories',
      
      // Batch operations
      selected: 'selected',
      batchClose: 'Close Selected',
      batchArchive: 'Archive Selected',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      noResults: 'No matching tabs found',
      noTabsSelected: 'Please select tabs first',
      tabsClosed: '{count} tabs closed',
      tabClosed: 'Tab closed',
      
      // Error messages
      loadError: 'Failed to load tabs, please retry',
      closeError: 'Failed to close tab',
      archiveError: 'Failed to archive',
      renderError: 'Render failed',
      toggleBatchMode: 'Batch Mode',
      batchModeEnabled: 'Batch mode enabled, click tabs to select',
      actionError: 'Action failed',
      
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
      confirmCloseGroup: 'Are you sure you want to close {count} tabs in "{group}" group?',
      confirmDeleteSession: 'Are you sure you want to delete session "{name}"?',
      confirmDelete: 'Are you sure you want to delete?',
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
      },
      
      // Export/Import
      exportSessions: 'Export Sessions',
      importSessions: 'Import Sessions',
      exportAll: 'Export All',
      exportSelected: 'Export Selected',
      exportSuccess: 'Export successful!',
      exportError: 'Export failed',
      importSuccess: 'Import successful! Imported {count} sessions',
      importError: 'Import failed',
      importFileInvalid: 'Invalid import file format',
      confirmImport: 'Import will overwrite existing sessions, continue?',
      renameSession: 'Rename Session',
      sessionName: 'Session Name',
      sessionTags: 'Tags',
      sessionSearch: 'Search sessions...',
      mergeSessions: 'Merge Sessions',
      selectSessionsToMerge: 'Please select sessions to merge',
      mergedSessionName: 'Merged Session',
      
      // Keyboard shortcuts
      shortcuts: 'Shortcuts',
      shortcutSearch: 'Ctrl/Cmd + K: Search',
      shortcutBatch: 'Ctrl/Cmd + B: Batch Mode',
      shortcutDelete: 'Delete: Close Selected',
      shortcutView1: '1: By Anxiety',
      shortcutView2: '2: By Category',
      shortcutView3: '3: By Group',
      shortcutEscape: 'Esc: Close/Cancel',
      
      // Settings
      settings: 'Settings',
      customClassificationRules: 'Custom Classification Rules',
      customAnxietyWeights: 'Custom Anxiety Score Weights',
      statisticsCharts: 'Statistics & Charts',
      addRule: 'Add Rule',
      editRule: 'Edit Rule',
      deleteRule: 'Delete Rule',
      ruleName: 'Rule Name',
      rulePriority: 'Priority',
      ruleDomains: 'Domains (comma-separated)',
      ruleKeywords: 'Keywords (comma-separated)',
      ruleUrlPattern: 'URL Pattern (regex)',
      saveRule: 'Save Rule',
      cancel: 'Cancel',
      presetDefault: 'Default',
      presetAggressive: 'Aggressive Cleanup',
      presetConservative: 'Conservative Cleanup',
      weightOpenDuration: 'Open Duration',
      weightDuplicateDomain: 'Duplicate Domain',
      weightInactiveTime: 'Inactive Time',
      weightIsSearchPage: 'Search Page',
      weightUnreadArticle: 'Unread Article',
      previewAnxiety: 'Preview Anxiety Score',
      resetWeights: 'Reset to Default',
      
      // Notifications
      notificationsAndReminders: 'Notifications & Reminders',
      tabCountReminder: 'Tab Count Reminder',
      tabCountReminderDesc: 'Notify when tab count exceeds threshold',
      highAnxietyReminder: 'High Anxiety Reminder',
      highAnxietyReminderDesc: 'Notify when high anxiety tabs exist',
      periodicCleanupReminder: 'Periodic Cleanup Reminder',
      periodicCleanupReminderDesc: 'Remind to clean up tabs periodically',
      sessionBackupReminder: 'Session Backup Reminder',
      sessionBackupReminderDesc: 'Remind to backup session data periodically',
      threshold: 'Threshold',
      tabs: 'tabs',
      anxietyThreshold: 'Anxiety Threshold',
      points: 'points',
      reminderInterval: 'Reminder Interval',
      daily: 'Daily',
      every3Days: 'Every 3 Days',
      weekly: 'Weekly',
      monthly: 'Monthly',
      every2Weeks: 'Every 2 Weeks',
      testNotification: 'Test Notification',
      notificationTabCountTitle: 'Too Many Tabs',
      notificationTabCountMessage: 'You have {count} tabs open. Consider closing some.',
      notificationHighAnxietyTitle: 'High Anxiety Tabs',
      notificationHighAnxietyMessage: 'You have {count} high anxiety tabs (≥{threshold}).',
      notificationCleanupTitle: 'Time to Clean Up',
      notificationCleanupMessage: 'It\'s been a while since your last cleanup. Consider organizing your tabs.',
      notificationBackupTitle: 'Backup Reminder',
      notificationBackupMessage: 'Don\'t forget to backup your session data.',
      
      // Accessibility
      accessibilitySettings: 'Accessibility Settings',
      fontSize: 'Font Size',
      fontSizeDesc: 'Adjust interface font size',
      highContrastMode: 'High Contrast Mode',
      highContrastModeDesc: 'Increase interface contrast for better readability',
      keyboardNavigation: 'Keyboard Navigation',
      keyboardTab: 'Navigate between elements',
      keyboardEnter: 'Activate button or link',
      keyboardEsc: 'Close menu or cancel operation',
      keyboardSearch: 'Focus search box',
      keyboardBatch: 'Toggle batch mode',
      keyboardView: 'Switch view mode'
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

