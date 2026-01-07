/**
 * Iron Loot - Modal Component
 */

const Modal = (function() {
  let activeModal = null;

  /**
   * Open a modal
   * @param {string} modalId 
   */
  function open(modalId) {
    const modal = Utils.$(`#${modalId}`);
    const backdrop = Utils.$(`#${modalId}Backdrop`) || Utils.$('.modal-backdrop');
    
    if (modal) {
      Utils.addClass(modal, 'is-active');
      if (backdrop) Utils.addClass(backdrop, 'is-active');
      Utils.addClass(document.body, 'modal-open');
      activeModal = modalId;
    }
  }

  /**
   * Close a modal
   * @param {string} modalId 
   */
  function close(modalId) {
    const modal = Utils.$(`#${modalId || activeModal}`);
    const backdrop = Utils.$(`#${modalId || activeModal}Backdrop`) || Utils.$('.modal-backdrop');
    
    if (modal) {
      Utils.removeClass(modal, 'is-active');
      if (backdrop) Utils.removeClass(backdrop, 'is-active');
      Utils.removeClass(document.body, 'modal-open');
      activeModal = null;
    }
  }

  /**
   * Show alert dialog
   * @param {object} options 
   */
  function alert(options = {}) {
    const { title, message, type = 'info', buttonText = 'Aceptar', onClose } = options;
    
    // TODO: Create dynamic alert modal
    window.alert(message);
    if (onClose) onClose();
  }

  /**
   * Show confirm dialog
   * @param {object} options 
   * @returns {Promise<boolean>}
   */
  function confirm(options = {}) {
    const { title, message, confirmText = 'Confirmar', cancelText = 'Cancelar' } = options;
    
    // TODO: Create dynamic confirm modal
    return Promise.resolve(window.confirm(message));
  }

  // Setup global event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Close modal on backdrop click
    Utils.$$('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => close());
    });

    // Close modal on close button click
    Utils.$$('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => close());
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeModal) {
        close();
      }
    });

    // Open modal buttons
    Utils.$$('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal-open');
        open(modalId);
      });
    });

    // Close modal buttons
    Utils.$$('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal-close');
        close(modalId);
      });
    });
  });

  return { open, close, alert, confirm };
})();

window.Modal = Modal;
