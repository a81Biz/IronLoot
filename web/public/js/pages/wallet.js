/**
 * Iron Loot - Wallet Page
 */

(function() {
  let currentBalance = 0;

  document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login?return=/wallet';
      return;
    }

    initWallet();
  });

  /**
   * Initialize wallet
   */
  async function initWallet() {
    // Load independently
    loadBalance();
    loadHistory();
    setupEventListeners();
  }

  /**
   * Load wallet balance
   */
  async function loadBalance() {
    try {
      const balance = await Api.wallet.getBalance();
      currentBalance = balance.available;
      
      Utils.$('#walletBalance').textContent = Utils.formatCurrency(balance.available);
      Utils.$('#walletHeld').textContent = Utils.formatCurrency(balance.held);
      Utils.$('#withdrawAvailable').textContent = Utils.formatCurrency(balance.available);
      
      // Withdraw Button State (QA-4)
      const withdrawBtn = Utils.$('#btnWithdrawModalOpen'); // Assuming there's a button to open modal
      // Wait, we need to disable the FORM inside the modal, or the Open Button?
      // QA says "deshabilitar retiro". Usually means the submission or the entry point.
      // Let's assume we validate on OPEN or inside modal. 
      // The instruction says "if balance < minWithdraw => disable form + message".
      // We'll handle this in setupWithdrawForm or when opening modal.
      // Since specific ID for open button isn't here, we'll listen to modal open event or check on init.
      
      // We'll update the setupWithdrawForm to check balance.
    } catch (error) {
      console.error('Failed to load balance:', error);
      Utils.$('#walletBalance').textContent = 'Error';
    }
  }

  /**
   * Load transaction history
   */
  async function loadHistory() {
    const container = Utils.$('#walletHistory');
    if (!container) return;

    try {
      const { history } = await Api.wallet.getHistory(20);

      if (!history || history.length === 0) {
        container.innerHTML = `
          <div class="text-center text-secondary" style="grid-column: 1/-1; padding: var(--spacing-8);">
            <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">receipt_long</span>
            <p style="margin-top: var(--spacing-4);">Sin movimientos aún</p>
          </div>
        `;
        return;
      }

      container.innerHTML = history.map(entry => `
        <div class="transaction-item">
          <div class="transaction-icon ${getTransactionIconClass(entry.type)}">
            <span class="material-symbols-outlined">${getTransactionIcon(entry.type)}</span>
          </div>
          <div class="transaction-info">
            <div class="transaction-description">${entry.description}</div>
            <div class="transaction-date">${Utils.formatDate(entry.createdAt)}</div>
          </div>
          <div class="transaction-amount ${entry.amount >= 0 ? 'positive' : 'negative'}">
            ${entry.amount >= 0 ? '+' : ''}${Utils.formatCurrency(entry.amount)}
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load history:', error);
      container.innerHTML = `
        <div class="text-center" style="grid-column: 1/-1; padding: var(--spacing-8);">
            <p class="text-error">Error al cargar el historial</p>
        </div>
      `;
    } finally {
        // Clear loading state if applicable
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Deposit suggestions
    Utils.$$('.deposit-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.$('#depositAmount').value = btn.dataset.amount;
      });
    });

    // Deposit button
    Utils.$('#btnDeposit')?.addEventListener('click', handleDeposit);

    // Withdraw button
    Utils.$('#btnWithdraw')?.addEventListener('click', handleWithdraw);

    // Modal open buttons
    Utils.$$('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modalOpen;
        
        // Withdraw guard (QA-4)
        if (modalId === 'withdrawModal') {
            const minWithdraw = 10;
            if (currentBalance < minWithdraw) {
                 Utils.toast('Saldo insuficiente para retirar (Mínimo $10.00)', 'error');
                 // Disable inputs in modal? Or prevent opening?
                 // Spec says "disable form + message". 
                 // Let's open modal but disable inputs + show warning.
                 setTimeout(() => {
                     const field = Utils.$('#withdrawAmount');
                     const submit = Utils.$('#btnWithdraw');
                     if(field) { field.disabled = true; field.value = ''; field.placeholder = "Saldo insuficiente"; }
                     if(submit) submit.disabled = true;
                 }, 100); 
            } else {
                 // Enable in case it was disabled previously
                  setTimeout(() => {
                     const field = Utils.$('#withdrawAmount');
                     const submit = Utils.$('#btnWithdraw');
                     if(field) { field.disabled = false; field.placeholder = "Monto a retirar"; }
                     if(submit) submit.disabled = false;
                 }, 100);
            }
        }
        
        Modal.open(modalId);
      });
    });

    // Modal close buttons
    Utils.$$('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modalClose;
        Modal.close(modalId);
      });
    });

    // Close modals on backdrop click
    Utils.$$('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        const modalId = backdrop.id.replace('Backdrop', '');
        Modal.close(modalId);
      });
    });
  }

  /**
   * Handle deposit
   */
  async function handleDeposit() {
    const amountInput = Utils.$('#depositAmount');
    const amount = parseFloat(amountInput.value);
    const btn = Utils.$('#btnDeposit');

    if (!amount || amount < 10) {
      Utils.toast('El monto mínimo es $10.00', 'error');
      return;
    }

    btn.disabled = true;
    btn.classList.add('btn-loading');

    try {
      // Generate a mock reference ID (in real app, this would come from payment provider)
      const referenceId = `DEP-${Date.now()}`;
      
      await Api.wallet.deposit(amount, referenceId);
      
      Utils.toast('Depósito realizado exitosamente', 'success');
      Modal.close('depositModal');
      amountInput.value = '';
      
      // Reload data
      await loadBalance();
      await loadHistory();
    } catch (error) {
      console.error('Deposit failed:', error);
      Utils.toast(error.message || 'Error al realizar el depósito', 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  }

  /**
   * Handle withdraw
   */
  async function handleWithdraw() {
    const amountInput = Utils.$('#withdrawAmount');
    const amount = parseFloat(amountInput.value);
    const btn = Utils.$('#btnWithdraw');

    if (!amount || amount < 10) {
      Utils.toast('El monto mínimo es $10.00', 'error');
      return;
    }

    if (amount > currentBalance) {
      Utils.toast('Fondos insuficientes', 'error');
      return;
    }

    btn.disabled = true;
    btn.classList.add('btn-loading');

    try {
      const referenceId = `WD-${Date.now()}`;
      
      await Api.wallet.withdraw(amount, referenceId);
      
      Utils.toast('Retiro procesado exitosamente', 'success');
      Modal.close('withdrawModal');
      amountInput.value = '';
      
      // Reload data
      await loadBalance();
      await loadHistory();
    } catch (error) {
      console.error('Withdraw failed:', error);
      Utils.toast(error.message || 'Error al procesar el retiro', 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  }

  /**
   * Get transaction icon
   */
  function getTransactionIcon(type) {
    const icons = {
      'DEPOSIT': 'add_circle',
      'WITHDRAWAL': 'remove_circle',
      'HOLD': 'lock',
      'RELEASE': 'lock_open',
      'PURCHASE': 'shopping_cart',
      'REFUND': 'undo',
      'ADJUSTMENT': 'tune',
    };
    return icons[type] || 'swap_horiz';
  }

  /**
   * Get transaction icon class
   */
  function getTransactionIconClass(type) {
    const classes = {
      'DEPOSIT': 'deposit',
      'WITHDRAWAL': 'withdrawal',
      'HOLD': 'hold',
      'RELEASE': 'deposit',
      'PURCHASE': 'withdrawal',
      'REFUND': 'deposit',
      'ADJUSTMENT': 'hold',
    };
    return classes[type] || 'hold';
  }
})();
