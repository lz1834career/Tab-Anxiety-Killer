// Toast 提示组件

class Toast {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // 创建 Toast 容器
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  /**
   * 显示 Toast
   * @param {string} message - 消息内容
   * @param {string} type - 类型：success, error, info, warning
   * @param {number} duration - 显示时长（毫秒）
   */
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // 图标
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;
    
    this.container.appendChild(toast);
    
    // 触发动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 自动移除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
    
    return toast;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }
}

// 创建全局 Toast 实例
const toast = new Toast();

