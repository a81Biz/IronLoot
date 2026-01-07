/**
 * Iron Loot - Sidebar Component
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const backdrop = Utils.$('#sidebarBackdrop');
    const mobileSidebar = Utils.$('#sidebarMobile');
    const closeBtn = Utils.$('#sidebarClose');

    // Toggle sidebar
    function toggleSidebar() {
      Utils.toggleClass(backdrop, 'is-active');
      Utils.toggleClass(mobileSidebar, 'is-active');
      Utils.toggleClass(document.body, 'modal-open');
    }

    // Close sidebar
    function closeSidebar() {
      Utils.removeClass(backdrop, 'is-active');
      Utils.removeClass(mobileSidebar, 'is-active');
      Utils.removeClass(document.body, 'modal-open');
    }

    // Listen for toggle event
    window.addEventListener('sidebar:toggle', toggleSidebar);

    // Close on backdrop click
    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSidebar);
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && Utils.hasClass(mobileSidebar, 'is-active')) {
        closeSidebar();
      }
    });

    // Highlight active sidebar link
    const currentPath = window.location.pathname;
    Utils.$$('.sidebar-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
        Utils.addClass(link, 'active');
      }
    });
  });
})();
