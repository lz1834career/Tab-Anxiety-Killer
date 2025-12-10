// 输入验证和清理模块

/**
 * 验证器类
 */
class Validator {
  /**
   * 验证 URL
   * @param {string} url - 要验证的 URL
   * @returns {boolean} 是否为有效 URL
   */
  static isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 验证标签页 ID
   * @param {number|string} tabId - 标签页 ID
   * @returns {boolean} 是否为有效标签页 ID
   */
  static isValidTabId(tabId) {
    return typeof tabId === 'number' && tabId > 0 && Number.isInteger(tabId);
  }

  /**
   * 验证会话名称
   * @param {string} name - 会话名称
   * @returns {Object} { valid: boolean, message: string }
   */
  static validateSessionName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, message: '会话名称不能为空' };
    }
    
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, message: '会话名称不能为空' };
    }
    
    if (trimmed.length > 100) {
      return { valid: false, message: '会话名称不能超过100个字符' };
    }
    
    // 检查危险字符
    const dangerousChars = /[<>\"'&]/;
    if (dangerousChars.test(trimmed)) {
      return { valid: false, message: '会话名称包含非法字符' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * 验证正则表达式
   * @param {string} pattern - 正则表达式字符串
   * @returns {Object} { valid: boolean, regex: RegExp|null, message: string }
   */
  static validateRegex(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      return { valid: false, regex: null, message: '正则表达式不能为空' };
    }
    
    try {
      const regex = new RegExp(pattern);
      return { valid: true, regex, message: '' };
    } catch (error) {
      return { valid: false, regex: null, message: '无效的正则表达式: ' + error.message };
    }
  }

  /**
   * 验证数字范围
   * @param {number} value - 要验证的值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {boolean} 是否在范围内
   */
  static isInRange(value, min, max) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * 验证数组
   * @param {*} value - 要验证的值
   * @param {number} minLength - 最小长度
   * @param {number} maxLength - 最大长度
   * @returns {boolean} 是否为有效数组
   */
  static isValidArray(value, minLength = 0, maxLength = Infinity) {
    if (!Array.isArray(value)) return false;
    return value.length >= minLength && value.length <= maxLength;
  }
}

/**
 * XSS 防护工具类
 */
class XSSProtection {
  /**
   * HTML 转义
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  static escapeHtml(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * 清理 HTML 内容（移除危险标签和属性）
   * @param {string} html - HTML 字符串
   * @returns {string} 清理后的 HTML
   */
  static sanitizeHtml(html) {
    if (typeof html !== 'string') return '';
    
    // 创建临时 DOM 元素
    const temp = document.createElement('div');
    temp.textContent = html; // 使用 textContent 自动转义
    
    // 只允许安全的 HTML 标签和属性
    const allowedTags = ['b', 'i', 'em', 'strong', 'span', 'div', 'p'];
    const allowedAttributes = ['class', 'style'];
    
    // 这里可以扩展为更复杂的清理逻辑
    // 当前实现使用 textContent 已经足够安全
    
    return temp.innerHTML;
  }

  /**
   * 验证并清理 URL
   * @param {string} url - URL 字符串
   * @returns {string|null} 清理后的 URL 或 null
   */
  static sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    // 移除 javascript: 和其他危险协议
    const dangerousProtocols = /^(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(url.trim())) {
      return null;
    }
    
    // 验证 URL 格式
    try {
      const urlObj = new URL(url);
      // 只允许 http 和 https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return null;
      }
      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * 清理用户输入
   * @param {string} input - 用户输入
   * @param {Object} options - 选项
   * @returns {string} 清理后的输入
   */
  static sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
      input = String(input);
    }
    
    // 移除控制字符
    input = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // 限制长度
    if (options.maxLength) {
      input = input.slice(0, options.maxLength);
    }
    
    // 移除前后空格
    if (options.trim !== false) {
      input = input.trim();
    }
    
    // HTML 转义
    if (options.escapeHtml !== false) {
      input = this.escapeHtml(input);
    }
    
    return input;
  }
}

/**
 * 数据验证工具
 */
class DataValidator {
  /**
   * 验证标签页数据
   * @param {Object} tab - 标签页对象
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validateTab(tab) {
    const errors = [];
    
    if (!tab) {
      errors.push('标签页对象不能为空');
      return { valid: false, errors };
    }
    
    if (!Validator.isValidTabId(tab.id)) {
      errors.push('无效的标签页 ID');
    }
    
    if (!tab.url || !Validator.isValidUrl(tab.url)) {
      errors.push('无效的 URL');
    }
    
    if (!tab.title || typeof tab.title !== 'string') {
      errors.push('无效的标题');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证会话数据
   * @param {Object} session - 会话对象
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validateSession(session) {
    const errors = [];
    
    if (!session) {
      errors.push('会话对象不能为空');
      return { valid: false, errors };
    }
    
    const nameValidation = Validator.validateSessionName(session.name);
    if (!nameValidation.valid) {
      errors.push(nameValidation.message);
    }
    
    if (!Validator.isValidArray(session.tabs, 0)) {
      errors.push('无效的标签页数组');
    }
    
    // 验证每个标签页
    if (session.tabs && Array.isArray(session.tabs)) {
      session.tabs.forEach((tab, index) => {
        const tabValidation = this.validateTab(tab);
        if (!tabValidation.valid) {
          errors.push(`标签页 ${index + 1}: ${tabValidation.errors.join(', ')}`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

