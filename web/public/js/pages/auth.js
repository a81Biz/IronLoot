/**
 * Iron Loot - UI Auth Manager
 * Handles UI updates for Auth state (Navbar, Sidebar)
 * Delegates logic to AuthState and AuthService
 */

const Auth = (function() {

  /**
   * Initialize auth UI
   */
  async function init() {
    // Listen for AuthState events (Single Source of Truth)
    window.addEventListener(AuthState.EVENTS.USER_UPDATED, () => updateUI(true));
    window.addEventListener(AuthState.EVENTS.USER_CLEARED, () => updateUI(false));

    // Initial check (if AuthState already ready)
    if (AuthState.isLoggedIn()) {
      updateUI(true);
    } else {
      updateUI(false);
    }
  }

  /**
   * Update UI based on auth state
   */
  function updateUI(isLoggedIn) {
    const authButtons = Utils.$('#navAuthButtons');
    const userMenu = Utils.$('#navUserMenu');
    const userName = Utils.$('#navUserName');
    const sidebarUser = Utils.$('#sidebarUser');
    const sidebarUserName = Utils.$('#sidebarUserName');
    const sidebarUserRole = Utils.$('#sidebarUserRole');
    const sidebarSellerSection = Utils.$('#sidebarSellerSection');
    
    // Get latest data from AuthState
    const user = AuthState.getUser()?.data;
    const isSeller = AuthState.isSeller();
    const displayName = AuthState.getDisplayName();

    if (isLoggedIn && user) {
      // Hide auth buttons, show user menu
      if (authButtons) authButtons.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      
      // Update user name
      if (userName) userName.textContent = displayName;
      if (sidebarUserName) sidebarUserName.textContent = displayName;
      
      // Show sidebar user card
      if (sidebarUser) sidebarUser.style.display = 'flex';
      
      // Update user role
      if (sidebarUserRole) {
        sidebarUserRole.textContent = isSeller ? 'Vendedor' : 'Comprador';
      }

      // Show seller section if user is seller
      if (sidebarSellerSection) {
        sidebarSellerSection.style.display = isSeller ? 'block' : 'none';
      }

      // Hide active auth-required elements
      Utils.$$('[data-auth="guest"]').forEach(el => el.style.display = 'none');
      Utils.$$('[data-auth="required"]').forEach(el => el.style.display = '');

      // Update notification count (using new Service)
      updateNotificationCount();
    } else {
      // Show auth buttons, hide user menu
      if (authButtons) authButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      
      // Hide sidebar user card
      if (sidebarUser) sidebarUser.style.display = 'none';
      if (sidebarSellerSection) sidebarSellerSection.style.display = 'none';

      // Show guest elements
      Utils.$$('[data-auth="guest"]').forEach(el => el.style.display = '');
      Utils.$$('[data-auth="required"]').forEach(el => el.style.display = 'none');
    }
  }

  /**
   * Update notification count
   */
  async function updateNotificationCount() {
    try {
      const { count } = await NotificationService.getUnreadCount();
      const badge = Utils.$('#notificationCount');
      const sidebarBadge = Utils.$('#sidebarNotifBadge');
      
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
      
      if (sidebarBadge) {
        sidebarBadge.textContent = count > 99 ? '99+' : count;
        sidebarBadge.style.display = count > 0 ? 'inline-block' : 'none';
      }
    } catch (error) {
       // Silent fail
    }
  }

  // --- Wrapper Methods for Login/Register Pages ---

  // --- Wrapper Methods for Login/Register Pages ---

  /**
   * Login Wrapper
   */
  async function login(email, password) {
    // Delegate strictly to Flow
    return AuthFlow.login({ email, password });
  }

  /**
   * Register Wrapper
   */
  async function register(userData) {
    // Delegate strictly to Flow
    return AuthFlow.register(userData);
  }

  /**
   * Logout Wrapper
   */
  async function logout() {
    // Delegate strictly to Flow
    await AuthFlow.logout();
  }

  // Public API
  return {
    init,
    getUser: AuthState.getUser,
    isLoggedIn: AuthState.isLoggedIn,
    isSeller: AuthState.isSeller,
    login,
    register,
    logout,
    updateNotificationCount,
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});

// Make it globally available
window.Auth = Auth;
