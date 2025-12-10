// 统一错误处理模块

/**
 * 错误类型枚举
 */
const ErrorType = {
  NETWORK: 'NETWORK',
  STORAGE: 'STORAGE',
  PERMISSION: 'PERMISSION',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * 错误处理器类
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * 处理错误
   * @param {Error|string} error - 错误对象或错误消息
   * @param {Object} context - 错误上下文信息
   * @param {string} type - 错误类型
   * @returns {Object} 错误信息对象
   */
  handle(error, context = {}, type = ErrorType.UNKNOWN) {
    const errorInfo = this.normalizeError(error, context, type);
    
    // 记录错误
    this.logError(errorInfo);
    
    // 根据错误类型处理
    switch (type) {
      case ErrorType.NETWORK:
        return this.handleNetworkError(errorInfo);
      case ErrorType.STORAGE:
        return this.handleStorageError(errorInfo);
      case ErrorType.PERMISSION:
        return this.handlePermissionError(errorInfo);
      case ErrorType.VALIDATION:
        return this.handleValidationError(errorInfo);
      default:
        return this.handleUnknownError(errorInfo);
    }
  }

  /**
   * 标准化错误信息
   * @param {Error|string} error - 错误对象或错误消息
   * @param {Object} context - 错误上下文
   * @param {string} type - 错误类型
   * @returns {Object} 标准化的错误信息
   */
  normalizeError(error, context, type) {
    const errorInfo = {
      type,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Chrome API 错误处理
    if (chrome?.runtime?.lastError) {
      errorInfo.chromeError = chrome.runtime.lastError.message;
      errorInfo.message = chrome.runtime.lastError.message;
    }

    return errorInfo;
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(errorInfo) {
    console.error('[Network Error]', errorInfo);
    if (typeof toast !== 'undefined') {
      toast.error(i18n?.t('networkError') || '网络错误，请检查网络连接');
    }
    return errorInfo;
  }

  /**
   * 处理存储错误
   */
  handleStorageError(errorInfo) {
    console.error('[Storage Error]', errorInfo);
    if (typeof toast !== 'undefined') {
      toast.error(i18n?.t('storageError') || '存储操作失败，请重试');
    }
    return errorInfo;
  }

  /**
   * 处理权限错误
   */
  handlePermissionError(errorInfo) {
    console.error('[Permission Error]', errorInfo);
    if (typeof toast !== 'undefined') {
      toast.error(i18n?.t('permissionError') || '权限不足，请检查扩展权限设置');
    }
    return errorInfo;
  }

  /**
   * 处理验证错误
   */
  handleValidationError(errorInfo) {
    console.error('[Validation Error]', errorInfo);
    if (typeof toast !== 'undefined') {
      toast.error(i18n?.t('validationError') || '输入验证失败');
    }
    return errorInfo;
  }

  /**
   * 处理未知错误
   */
  handleUnknownError(errorInfo) {
    console.error('[Unknown Error]', errorInfo);
    if (typeof toast !== 'undefined') {
      toast.error(i18n?.t('unknownError') || '发生未知错误，请重试');
    }
    return errorInfo;
  }

  /**
   * 记录错误日志
   */
  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // 在开发环境下输出详细错误
    if (process?.env?.NODE_ENV === 'development' || window.DEBUG) {
      console.group('Error Details');
      console.error('Type:', errorInfo.type);
      console.error('Message:', errorInfo.message);
      console.error('Context:', errorInfo.context);
      console.error('Stack:', errorInfo.stack);
      console.groupEnd();
    }
  }

  /**
   * 获取错误日志
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * 安全执行异步函数
   * @param {Function} fn - 要执行的异步函数
   * @param {Object} context - 错误上下文
   * @param {string} type - 错误类型
   * @returns {Promise} 执行结果
   */
  async safeExecute(fn, context = {}, type = ErrorType.UNKNOWN) {
    try {
      return await fn();
    } catch (error) {
      return this.handle(error, context, type);
    }
  }

  /**
   * 安全执行同步函数
   * @param {Function} fn - 要执行的函数
   * @param {Object} context - 错误上下文
   * @param {string} type - 错误类型
   * @returns {*} 执行结果
   */
  safeExecuteSync(fn, context = {}, type = ErrorType.UNKNOWN) {
    try {
      return fn();
    } catch (error) {
      return this.handle(error, context, type);
    }
  }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 全局错误捕获
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  }, ErrorType.UNKNOWN);
});

// Promise 未捕获错误
window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason, {
    promise: event.promise
  }, ErrorType.UNKNOWN);
  event.preventDefault(); // 阻止默认的错误输出
});

