/**
 * NotificationService
 * @role API Wrapper (Domain: Notifications)
 */
window.NotificationService = (function() {

    async function list() {
        const { data } = await Api.get(ApiRoutes.notifications.list);
        return data;
    }

    async function getUnreadCount() {
        const { data } = await Api.get(ApiRoutes.notifications.unreadCount);
        return data;
    }

    async function markAsRead(id) {
        return Api.patch(ApiRoutes.notifications.markRead(id));
    }

    async function markAllAsRead() {
        return Api.patch(ApiRoutes.notifications.readAll);
    }

    return {
        list,
        getUnreadCount,
        markAsRead,
        markAllAsRead
    };
})();
