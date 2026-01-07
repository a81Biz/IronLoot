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
    await loadBalance();
    await loadHistory();
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
          <p class="text-secondary text-center">No hay transacciones</p>
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
        <p class="text-error text-center">Error al cargar el historial</p>
      `;
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
