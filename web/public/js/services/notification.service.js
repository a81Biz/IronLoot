/**
 * NotificationService
 * @role API Wrapper (Domain: Notifications)
 */
window.NotificationService = (function() {

    async function list() {
        const { data } = await Api.get('/notifications');
        return data;
    }

    async function getUnreadCount() {
        const { data } = await Api.get('/notifications/unread-count');
        return data;
    }

    async function markAsRead(id) {
        return Api.patch(`/notifications/${id}/read`);
    }

    async function markAllAsRead() {
        return Api.patch('/notifications/read-all');
    }

    return {
        list,
        getUnreadCount,
        markAsRead,
        markAllAsRead
    };
})();
