/**
 * NotificationFlow
 * @role Orchestrator (Notifications)
 * @depends NotificationService
 */
window.NotificationFlow = (function() {

    /**
     * Load Notifications
     */
    async function loadNotifications() {
        return NotificationService.list();
    }

    /**
     * Get Unread Count
     */
    async function getUnreadCount() {
        return NotificationService.getUnreadCount();
    }

    /**
     * Mark As Read
     * @param {string|'all'} id 
     */
    async function markAsRead(id) {
        if (id === 'all') {
            await NotificationService.markAllAsRead();
        } else {
            await NotificationService.markAsRead(id);
        }
        // Emit update so Navbar can refresh badge
        window.dispatchEvent(new CustomEvent('notifications:updated'));
    }

    return {
        loadNotifications,
        getUnreadCount,
        markAsRead
    };
})();
