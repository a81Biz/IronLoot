/**
 * Iron Loot - Navigation Component
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Logout button
    const logoutBtn = Utils.$('#navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await Auth.logout();
          window.location.href = '/';
        } catch (error) {
          console.error('Logout failed:', error);
        }
      });
    }

    // Search functionality
    const searchInput = Utils.$('#navSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query) {
            window.location.href = `/auctions?search=${encodeURIComponent(query)}`;
          }
        }
      });
    }

    // Mobile menu toggle
    const menuToggle = Utils.$('#navMenuToggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('sidebar:toggle'));
      });
    }

    // Highlight active nav link
    const currentPath = window.location.pathname;
    Utils.$$('.navbar-link').forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        Utils.addClass(link, 'active');
      }
    });

    // --- Update Auth UI ---
    updateAuthUI();

    // Listen for login/logout events
    window.addEventListener('auth:login', updateAuthUI);
    window.addEventListener('auth:logout', updateAuthUI);

    function updateAuthUI() {
      const isAuthenticated = Api.isAuthenticated();
      const authButtons = Utils.$('#navAuthButtons');
      const userMenu = Utils.$('#navUserMenu');
      const authLinks = Utils.$$('[data-auth="required"]');

      if (isAuthenticated) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        
        // Show protected links
        authLinks.forEach(link => link.style.display = 'block');
      } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        
        // Hide protected links
        authLinks.forEach(link => link.style.display = 'none');
      }
    }
  });
})();
