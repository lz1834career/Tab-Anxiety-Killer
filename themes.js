// 主题/风格管理器

const themes = {
  currentTheme: 'default',
  
  themes: {
    default: {
      name: 'default',
      label: { 'zh-CN': '默认', 'en-US': 'Default' },
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        background: '#f5f5f5',
        card: '#ffffff',
        text: '#333333',
        textSecondary: '#666666',
        border: '#eeeeee',
        success: '#44aa44',
        warning: '#ffaa00',
        danger: '#ff4444'
      }
    },
    dark: {
      name: 'dark',
      label: { 'zh-CN': '暗色', 'en-US': 'Dark' },
      colors: {
        primary: '#7c3aed',
        secondary: '#a855f7',
        background: '#1a1a1a',
        card: '#2d2d2d',
        text: '#e0e0e0',
        textSecondary: '#b0b0b0',
        border: '#404040',
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171'
      }
    },
    light: {
      name: 'light',
      label: { 'zh-CN': '浅色', 'en-US': 'Light' },
      colors: {
        primary: '#3b82f6',
        secondary: '#2563eb',
        background: '#ffffff',
        card: '#f8f9fa',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      }
    },
    colorful: {
      name: 'colorful',
      label: { 'zh-CN': '彩色', 'en-US': 'Colorful' },
      colors: {
        primary: '#ec4899',
        secondary: '#8b5cf6',
        background: '#fef3c7',
        card: '#ffffff',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#fde68a',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      }
    },
    highContrast: {
      name: 'highContrast',
      label: { 'zh-CN': '高对比度', 'en-US': 'High Contrast' },
      colors: {
        primary: '#000000',
        secondary: '#000000',
        background: '#ffffff',
        card: '#ffffff',
        text: '#000000',
        textSecondary: '#000000',
        border: '#000000',
        success: '#000000',
        warning: '#000000',
        danger: '#000000'
      }
    }
  },
  
  /**
   * 应用主题
   * @param {string} themeName - 主题名称
   */
  applyTheme(themeName) {
    if (!this.themes[themeName]) {
      themeName = 'default';
    }
    
    this.currentTheme = themeName;
    const theme = this.themes[themeName];
    const root = document.documentElement;
    
    // 应用 CSS 变量
    Object.keys(theme.colors).forEach(key => {
      root.style.setProperty(`--theme-${key}`, theme.colors[key]);
    });
    
    // 保存到存储
    chrome.storage.local.set({ theme: themeName });
    
    // 添加主题类名
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeName}`);
  },
  
  /**
   * 初始化主题（从存储中加载）
   */
  async initTheme() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['theme'], (result) => {
        const savedTheme = result.theme || 'default';
        this.applyTheme(savedTheme);
        resolve(savedTheme);
      });
    });
  },
  
  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return this.currentTheme;
  },
  
  /**
   * 获取所有主题
   */
  getAllThemes() {
    return this.themes;
  },
  
  /**
   * 获取主题标签（根据当前语言）
   */
  getThemeLabel(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return themeName;
    
    const lang = typeof i18n !== 'undefined' ? i18n.getLanguage() : 'zh-CN';
    return theme.label[lang] || theme.label['zh-CN'];
  }
};

