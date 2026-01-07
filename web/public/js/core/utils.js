/**
 * Iron Loot - Utility Functions
 */

const Utils = {
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
   */
  toast(message, type = 'info') {
    // TODO: Implement toast notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
  },
};

// Make it globally available
window.Utils = Utils;
