// 性能优化工具模块

/**
 * DOM 操作优化工具
 */
class DOMOptimizer {
  /**
   * 批量 DOM 操作（使用 DocumentFragment）
   * @param {Function} callback - 操作回调函数，接收 DocumentFragment 作为参数
   * @param {HTMLElement} container - 容器元素
   */
  static batchDOMOperation(callback, container) {
    const fragment = document.createDocumentFragment();
    callback(fragment);
    if (container) {
      container.appendChild(fragment);
    }
    return fragment;
  }

  /**
   * 防抖 DOM 更新
   * @param {Function} fn - 要执行的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  static debounceDOMUpdate(fn, delay = 100) {
    let timeoutId;
    let lastArgs;
    
    return function(...args) {
      lastArgs = args;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, lastArgs);
      }, delay);
    };
  }

  /**
   * 使用 requestAnimationFrame 优化 DOM 更新
   * @param {Function} fn - 要执行的函数
   * @returns {Promise} 执行完成后的 Promise
   */
  static rafUpdate(fn) {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        fn();
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /**
   * 虚拟滚动辅助类
   */
  static createVirtualScroll(container, itemHeight, totalItems, renderItem) {
    let scrollTop = 0;
    const visibleCount = Math.ceil(container.clientHeight / itemHeight);
    
    const update = () => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + 2, totalItems);
      
      // 清空容器
      container.innerHTML = '';
      
      // 设置容器高度
      container.style.height = `${totalItems * itemHeight}px`;
      
      // 创建可见项
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i < endIndex; i++) {
        const item = renderItem(i);
        item.style.position = 'absolute';
        item.style.top = `${i * itemHeight}px`;
        item.style.height = `${itemHeight}px`;
        fragment.appendChild(item);
      }
      
      container.appendChild(fragment);
    };
    
    container.addEventListener('scroll', () => {
      scrollTop = container.scrollTop;
      update();
    });
    
    update();
    
    return {
      update,
      scrollTo: (index) => {
        container.scrollTop = index * itemHeight;
      }
    };
  }
}

/**
 * 事件委托管理器
 */
class EventDelegator {
  constructor(container) {
    this.container = container;
    this.handlers = new Map();
  }

  /**
   * 注册事件委托
   * @param {string} eventType - 事件类型
   * @param {string} selector - CSS 选择器
   * @param {Function} handler - 事件处理函数
   */
  on(eventType, selector, handler) {
    const key = `${eventType}:${selector}`;
    
    if (!this.handlers.has(key)) {
      const wrappedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target) {
          handler.call(target, e, target);
        }
      };
      
      this.container.addEventListener(eventType, wrappedHandler);
      this.handlers.set(key, { original: handler, wrapped: wrappedHandler });
    }
  }

  /**
   * 移除事件委托
   * @param {string} eventType - 事件类型
   * @param {string} selector - CSS 选择器
   */
  off(eventType, selector) {
    const key = `${eventType}:${selector}`;
    const handler = this.handlers.get(key);
    
    if (handler) {
      this.container.removeEventListener(eventType, handler.wrapped);
      this.handlers.delete(key);
    }
  }

  /**
   * 销毁所有事件委托
   */
  destroy() {
    this.handlers.forEach((handler, key) => {
      const [eventType] = key.split(':');
      this.container.removeEventListener(eventType, handler.wrapped);
    });
    this.handlers.clear();
  }
}

/**
 * 图片懒加载管理器
 */
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      root: options.root || null,
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.1,
      placeholder: options.placeholder || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16"%3E%3C/svg%3E'
    };
    
    this.observer = null;
    this.init();
  }

  /**
   * 初始化 IntersectionObserver
   */
  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, this.options);
    }
  }

  /**
   * 加载图片
   * @param {HTMLImageElement} img - 图片元素
   */
  loadImage(img) {
    const src = img.dataset.src || img.getAttribute('data-src');
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      img.classList.remove('lazy');
      img.classList.add('loaded');
    }
  }

  /**
   * 观察图片元素
   * @param {HTMLImageElement} img - 图片元素
   */
  observe(img) {
    if (this.observer) {
      img.src = this.options.placeholder;
      img.classList.add('lazy');
      this.observer.observe(img);
    } else {
      // 降级处理：直接加载
      this.loadImage(img);
    }
  }

  /**
   * 停止观察
   * @param {HTMLImageElement} img - 图片元素
   */
  unobserve(img) {
    if (this.observer) {
      this.observer.unobserve(img);
    }
  }

  /**
   * 销毁观察器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

/**
 * 性能监控工具
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 100;
  }

  /**
   * 开始性能测量
   * @param {string} name - 测量名称
   * @returns {Function} 结束测量函数
   */
  startMeasure(name) {
    const startTime = performance.now();
    const startMark = `start_${name}_${Date.now()}`;
    performance.mark(startMark);
    
    return () => {
      const endTime = performance.now();
      const endMark = `end_${name}_${Date.now()}`;
      performance.mark(endMark);
      
      const duration = endTime - startTime;
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now()
      });
      
      // 清理标记
      try {
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
      } catch (e) {
        // 忽略清理错误
      }
      
      return duration;
    };
  }

  /**
   * 记录性能指标
   * @param {Object} metric - 性能指标
   */
  recordMetric(metric) {
    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // 在开发环境下输出
    if (window.DEBUG) {
      console.log(`[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getReport() {
    const grouped = {};
    
    this.metrics.forEach(metric => {
      if (!grouped[metric.name]) {
        grouped[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0
        };
      }
      
      const stats = grouped[metric.name];
      stats.count++;
      stats.total += metric.duration;
      stats.min = Math.min(stats.min, metric.duration);
      stats.max = Math.max(stats.max, metric.duration);
    });
    
    // 计算平均值
    Object.keys(grouped).forEach(name => {
      const stats = grouped[name];
      stats.avg = stats.total / stats.count;
    });
    
    return grouped;
  }

  /**
   * 清空指标
   */
  clear() {
    this.metrics = [];
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor();

