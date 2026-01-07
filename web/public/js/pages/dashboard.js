/**
 * Iron Loot - Dashboard Page
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login?return=/dashboard';
      return;
    }

    initDashboard();
  });

  /**
   * Initialize dashboard
   */
  async function initDashboard() {
    const user = Auth.getUser();
    
    // Update user name
    const userNameEl = Utils.$('#dashboardUserName');
    if (userNameEl && user) {
      userNameEl.textContent = user.displayName || user.username;
    }

    // Show create auction button for sellers
    if (Auth.isSeller()) {
      Utils.show('#btnCreateAuction');
    }

    // Load all dashboard data
    await Promise.all([
      loadStats(),
      loadRecentActivity(),
      loadActiveBids(),
    ]);
  }

  /**
   * Load dashboard stats
   */
  async function loadStats() {
    try {
      // Load wallet balance
      const balance = await Api.wallet.getBalance();
      Utils.$('#statBalance').textContent = Utils.formatCurrency(balance.available);

      // TODO: Load other stats from API when endpoints are ready
      // For now, using placeholder values
      Utils.$('#statActiveBids').textContent = '3';
      Utils.$('#statWonAuctions').textContent = '5';
      Utils.$('#statWatchlist').textContent = '12';
    } catch (error) {
      console.error('Failed to load stats:', error);
      Utils.$('#statBalance').textContent = '$0.00';
    }
  }

  /**
   * Load recent activity
   */
  async function loadRecentActivity() {
    const container = Utils.$('#recentActivity');
    if (!container) return;

    try {
      const notifications = await Api.notifications.list();
      
      if (!notifications || notifications.length === 0) {
        container.innerHTML = `
          <p class="text-secondary text-center">No hay actividad reciente</p>
        `;
        return;
      }

      container.innerHTML = notifications.slice(0, 5).map(notif => `
        <div class="transaction-item">
          <div class="transaction-icon ${getNotificationIconClass(notif.type)}">
            <span class="material-symbols-outlined">${getNotificationIcon(notif.type)}</span>
          </div>
          <div class="transaction-info">
            <div class="transaction-description">${notif.title}</div>
            <div class="transaction-date">${Utils.formatRelativeTime(notif.createdAt)}</div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load activity:', error);
      container.innerHTML = `
        <p class="text-secondary text-center">Error al cargar la actividad</p>
      `;
    }
  }

  /**
   * Load active bids
   */
  async function loadActiveBids() {
    const activeBidsList = Utils.$('#activeBidsTable');
    if (!activeBidsList) return;

    try {
      const bids = await Api.bids.getMyActiveBids();
      
      if (!bids || bids.length === 0) {
        activeBidsList.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-secondary">No tienes pujas activas</td>
          </tr>
        `;
        return;
      }

      activeBidsList.innerHTML = bids.map(bid => `
        <tr>
          <td>
            <a href="/auctions/${bid.auction?.slug || '#'}" class="fw-bold text-decoration-none">
              ${bid.auction?.title || 'Unknown Item'}
            </a>
          </td>
          <td>${Utils.formatCurrency(bid.amount)}</td>
          <td>${Utils.formatCurrency(bid.currentPrice || bid.amount)}</td>
          <td>${bid.auction?.endsAt ? Utils.formatRelativeTime(bid.auction.endsAt) : '-'}</td>
          <td>
            <span class="badge ${bid.status === 'WINNING' ? 'bg-success' : 'bg-warning text-dark'}">
              ${bid.status === 'WINNING' ? 'Ganando' : 'Superado'}
            </span>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Failed to load active bids:', error);
      activeBidsList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger">Error al cargar las pujas</td>
        </tr>
      `;
    }
  }

  /**
   * Get notification icon
   */
  function getNotificationIcon(type) {
    const icons = {
      'AUCTION_WON': 'emoji_events',
      'BID_OUTBID': 'trending_up',
      'ORDER_PAID': 'payments',
      'ORDER_SHIPPED': 'local_shipping',
      'DISPUTE_UPDATE': 'gavel',
      'SYSTEM': 'info',
    };
    return icons[type] || 'notifications';
  }

  /**
   * Get notification icon class
   */
  function getNotificationIconClass(type) {
    const classes = {
      'AUCTION_WON': 'deposit',
      'BID_OUTBID': 'withdrawal',
      'ORDER_PAID': 'deposit',
      'ORDER_SHIPPED': 'hold',
      'DISPUTE_UPDATE': 'hold',
      'SYSTEM': 'hold',
    };
    return classes[type] || 'hold';
  }
})();
