/**
 * Iron Loot - Utility Functions
 */

const Utils = {
  /**
   * Escape HTML to prevent XSS
   * @param {string} unsafe 
   * @returns {string}
   */
  escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
   * Format currency
   * @param {number} amount 
   * @param {string} currency 
   * @returns {string}
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  // ... (keeping other methods same, just injecting escapeHtml at top) ...

// ... down to toast ...


  /**
   * Format date
   * @param {string|Date} date 
   * @param {object} options 
   * @returns {string}
   */
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };
    return new Intl.DateTimeFormat('es-MX', defaultOptions).format(new Date(date));
  },

  /**
   * Format relative time (e.g., "hace 5 minutos")
   * @param {string|Date} date 
   * @returns {string}
   */
  formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = now - then;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days}d`;
    if (hours > 0) return `hace ${hours}h`;
    if (minutes > 0) return `hace ${minutes}m`;
    return 'ahora';
  },

  /**
   * Format countdown (e.g., "2d 14h 30m")
   * @param {string|Date} endDate 
   * @returns {string}
   */
  formatCountdown(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return 'Finalizada';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  },

  /**
   * Format duration from milliseconds
   * @param {number} ms 
   * @returns {string}
   */
  formatDuration(ms) {
    if (!ms || ms < 0) return '0m';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days >= 1) return `${days} ${days === 1 ? 'día' : 'días'}`;
    if (hours >= 1) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  },

  /**
   * Debounce function
   * @param {Function} func 
   * @param {number} wait 
   * @returns {Function}
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   * @param {Function} func 
   * @param {number} limit 
   * @returns {Function}
   */
  throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Get cookie by name
   * @param {string} name 
   * @returns {string|null}
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },

  /**
   * Set or get value of form element
   * @param {string|Element} selector 
   * @param {string} [value] 
   * @returns {string|void}
   */
  val(selector, value) {
    const el = typeof selector === 'string' ? this.$(selector) : selector;
    if (!el) return;
    
    if (value === undefined) {
      return el.value;
    }
    el.value = value;
  },

  /**
   * Set text content of element
   * @param {string|Element} selector 
   * @param {string} text 
   */
  text(selector, text) {
    const el = typeof selector === 'string' ? this.$(selector) : selector;
    if (!el) return;
    el.textContent = text;
  },

  /**
   * Get element by selector
   * @param {string} selector 
   * @returns {Element|null}
   */
  $(selector) {
    return document.querySelector(selector);
  },

  /**
   * Get all elements by selector
   * @param {string} selector 
   * @returns {NodeList}
   */
  $$(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Show element
   * @param {Element|string} el 
   */
  show(el) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (element) element.style.display = '';
  },

  /**
   * Hide element
   * @param {Element|string} el 
   */
  hide(el) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (element) element.style.display = 'none';
  },

  /**
   * Toggle element visibility
   * @param {Element|string} el 
   */
  toggle(el) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (element) {
      element.style.display = element.style.display === 'none' ? '' : 'none';
    }
  },

  /**
   * Add class to element
   * @param {Element|string} el 
   * @param {string} className 
   */
  addClass(el, className) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (element) element.classList.add(className);
  },

  /**
   * Remove class from element
   * @param {Element|string} el 
   * @param {string} className 
   */
  removeClass(el, className) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (element) element.classList.remove(className);
  },

  /**
   * Toggle class on element
   * @param {Element|string} el 
   * @param {string} className 
   */
  toggleClass(el, className) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (element) element.classList.toggle(className);
  },

  /**
   * Check if element has class
   * @param {Element|string} el 
   * @param {string} className 
   * @returns {boolean}
   */
  hasClass(el, className) {
    const element = typeof el === 'string' ? this.$(el) : el;
    return element ? element.classList.contains(className) : false;
  },

  /**
   * Show toast notification
   * @param {string} message 
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Duration in ms (default 5000)
   */
  toast(message, type = 'info', duration = 5000) {
    // Get or create toast container
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    
    // Colors based on type
    const colors = {
      success: { bg: '#10b981', text: '#ffffff' },
      error: { bg: '#ef4444', text: '#ffffff' },
      warning: { bg: '#f59e0b', text: '#1f2937' },
      info: { bg: '#3b82f6', text: '#ffffff' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: ${color.bg};
      color: ${color.text};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      font-size: 14px;
    `;
    
    toast.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 20px;">${icons[type] || icons.info}</span>
      <span style="flex: 1;">${this.escapeHtml(message)}</span>
      <button style="background: none; border: none; color: inherit; cursor: pointer; padding: 4px; display: flex; align-items: center;">
        <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
      </button>
    `;

    // Add CSS animation if not exists
    if (!document.getElementById('toastStyles')) {
      const style = document.createElement('style');
      style.id = 'toastStyles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Close button handler
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    });

    // Add to container
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },
};

// Make it globally available
window.Utils = Utils;
