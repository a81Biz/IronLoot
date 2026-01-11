/**
 * Iron Loot - Notifications List
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadNotifications();
        
        Utils.$('#btnMarkAllRead')?.addEventListener('click', async () => {
             try {
                 await Api.notifications.markAllAsRead();
                 loadNotifications();
                 // Should also update Badge (navigation.js polls, but we can manually trigger if needed)
                 // navigation.js will pick it up on next poll or we can dispatch event.
             } catch (e) {
                 console.error(e);
             }
        });
    });

    async function loadNotifications() {
        const container = Utils.$('#notificationsList');
        if (!container) return;

        try {
            const notifications = await Api.notifications.list();
            
            if (!notifications || notifications.length === 0) {
                container.innerHTML = `
                    <div class="text-center" style="padding: var(--spacing-8);">
                        <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.2;">notifications_off</span>
                        <p class="text-secondary mt-2">No tienes notificaciones</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = notifications.map(notif => `
                <div class="notification-item ${notif.readAt ? '' : 'unread'}" data-id="${notif.id}" data-json='${JSON.stringify(notif).replace(/'/g, "&apos;")}'>
                    <div class="notification-icon ${notif.readAt ? '' : 'active'}">
                        <span class="material-symbols-outlined">${getIcon(notif.type)}</span>
                    </div>
                    <div style="flex: 1;">
                        <h4 class="font-bold">${Utils.escapeHtml(notif.title)}</h4>
                        <p class="text-sm">${Utils.escapeHtml(notif.message)}</p>
                        <p class="notification-time">${Utils.formatRelativeTime(notif.createdAt)}</p>
                    </div>
                     ${!notif.readAt ? '<div style="width: 8px; height: 8px; background: var(--color-primary); border-radius: 50%; align-self: center;"></div>' : ''}
                </div>
            `).join('');
            
            // Add click handlers
            container.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const notif = JSON.parse(item.dataset.json);
                    
                    // 1. Mark as read
                    if (!notif.readAt) {
                        try {
                            await Api.notifications.markAsRead(notif.id);
                        } catch (e) { console.error('Failed to mark read', e); }
                    }
                    
                    // 2. Navigate (Deep Link Fallback Logic)
                    navigateNotification(notif);
                });
            });

        } catch (error) {
            console.error('Failed to load notifications:', error);
            container.innerHTML = '<p class="text-error text-center">Error al cargar notificaciones</p>';
        }
    }
    
    function navigateNotification(notification) {
        // "Notification Deep Link Fallback: When clicking a notification:
        //  If notification.url exists, navigate to it.
        //  If not, but entityType/entityId exist, map to /auctions/:id, /orders/:id, or /disputes/:id.
        //  If nothing applies, navigate to /notifications (reload) or do nothing.
        //  Always mark the notification as read." (Done above)
        
        if (notification.url && notification.url.startsWith('/') && !notification.url.startsWith('//')) {
            window.location.href = notification.url;
            return;
        }
        
        if (notification.entityType && notification.entityId) {
            switch (notification.entityType) {
                case 'AUCTION':
                    window.location.href = `/auctions/${notification.entityId}`;
                    return;
                case 'ORDER':
                    window.location.href = `/orders/${notification.entityId}`;
                    return;
                case 'DISPUTE':
                    window.location.href = `/disputes/${notification.entityId}`; // Not implemented yet but mapped
                    return;
                case 'USER':
                    // Maybe profile?
                    return;
            }
        }
        
        // Default: stay or reload
        window.location.reload();
    }

    function getIcon(type) {
         const icons = {
          'AUCTION_WON': 'emoji_events',
          'BID_OUTBID': 'trending_down',
          'ORDER_PAID': 'payments',
          'ORDER_SHIPPED': 'local_shipping',
          'DISPUTE_UPDATE': 'gavel',
          'SYSTEM': 'info',
        };
        return icons[type] || 'notifications';
    }
})();
