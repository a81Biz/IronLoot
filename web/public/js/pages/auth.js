/**
 * Iron Loot - Auth Manager
 * Handles authentication state and UI updates
 */

const Auth = (function() {
  // State
  let currentUser = null;

  /**
   * Initialize auth state
   */
  async function init() {
    // Listen for auth events
    window.addEventListener('auth:login', handleLogin);
    window.addEventListener('auth:logout', handleLogout);

    // Check if user is authenticated
    if (Api.isAuthenticated()) {
      try {
        currentUser = await Api.auth.me();
        updateUI(true);
      } catch (error) {
        console.error('Failed to get user info:', error);
        Api.clearTokens();
        updateUI(false);
      }
    } else {
      updateUI(false);
    }
  }

  /**
   * Handle login event
   */
  function handleLogin(event) {
    currentUser = event.detail;
    updateUI(true);
  }

  /**
   * Handle logout event
   */
  function handleLogout() {
    currentUser = null;
    updateUI(false);
    
    // Redirect to home if on protected page
    const protectedPages = ['/dashboard', '/wallet', '/profile', '/my-bids', '/watchlist'];
    if (protectedPages.some(page => window.location.pathname.startsWith(page))) {
      window.location.href = '/login';
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

    if (isLoggedIn && currentUser) {
      // Hide auth buttons, show user menu
      if (authButtons) authButtons.style.display = 'none';
      if (userMenu) userMenu.style.display = 'flex';
      
      // Update user name
      const displayName = currentUser.displayName || currentUser.username;
      if (userName) userName.textContent = displayName;
      if (sidebarUserName) sidebarUserName.textContent = displayName;
      
      // Show sidebar user card
      if (sidebarUser) sidebarUser.style.display = 'flex';
      
      // Update user role
      if (sidebarUserRole) {
        sidebarUserRole.textContent = currentUser.isSeller ? 'Vendedor' : 'Comprador';
      }

      // Show seller section if user is seller
      if (sidebarSellerSection) {
        sidebarSellerSection.style.display = currentUser.isSeller ? 'block' : 'none';
      }

      // Hide auth-required elements that should only show for logged out users
      Utils.$$('[data-auth="guest"]').forEach(el => el.style.display = 'none');
      Utils.$$('[data-auth="required"]').forEach(el => el.style.display = '');

      // Update notification count
      updateNotificationCount();
    } else {
      // Show auth buttons, hide user menu
      if (authButtons) authButtons.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
      
      // Hide sidebar user card
      if (sidebarUser) sidebarUser.style.display = 'none';
      if (sidebarSellerSection) sidebarSellerSection.style.display = 'none';

      // Show guest elements, hide auth-required elements
      Utils.$$('[data-auth="guest"]').forEach(el => el.style.display = '');
      Utils.$$('[data-auth="required"]').forEach(el => el.style.display = 'none');
    }
  }

  /**
   * Update notification count
   */
  async function updateNotificationCount() {
    try {
      const { count } = await Api.notifications.getUnreadCount();
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
      console.error('Failed to get notification count:', error);
    }
  }

  /**
   * Get current user
   */
  function getUser() {
    return currentUser;
  }

  /**
   * Check if user is authenticated
   */
  function isLoggedIn() {
    return Api.isAuthenticated() && currentUser !== null;
  }

  /**
   * Check if user is seller
   */
  function isSeller() {
    return currentUser?.isSeller === true;
  }

  /**
   * Login
   */
  async function login(email, password) {
    const result = await Api.auth.login(email, password);
    currentUser = result.user;
    return result;
  }

  /**
   * Register
   */
  async function register(userData) {
    return Api.auth.register(userData);
  }

  /**
   * Logout
   */
  async function logout() {
    await Api.auth.logout();
  }

  // Public API
  return {
    init,
    getUser,
    isLoggedIn,
    isSeller,
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
