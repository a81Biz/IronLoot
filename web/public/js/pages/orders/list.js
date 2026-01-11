/**
 * Iron Loot - Orders List
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadOrders();
    });

    async function loadOrders() {
        const tbody = Utils.$('#ordersTable');
        if (!tbody) return;

        try {
            const orders = await Api.orders.list();
            
            if (!orders || orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-secondary">No tienes órdenes registradas</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td class="font-mono text-sm">${order.id.substring(0, 8)}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                            <img src="${Utils.escapeHtml(getImage(order))}" 
                                 alt="Item" 
                                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                            <span class="fw-bold">${Utils.escapeHtml(order.itemSnapshot?.title || 'Artículo')}</span>
                        </div>
                    </td>
                    <td>${Utils.formatCurrency(order.total)}</td>
                    <td>${Utils.formatRelativeTime(order.createdAt)}</td>
                    <td>${formatStatus(order.status)}</td>
                    <td>
                        <a href="/orders/${order.id}" class="btn btn-secondary btn-sm">
                            Ver Detalle
                        </a>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load orders:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-error">Error al cargar las órdenes</td>
                </tr>
            `;
        }
    }

    function getImage(order) {
        return order.itemSnapshot?.images?.[0] || 'https://via.placeholder.com/40x40';
    }

    function formatStatus(status) {
        let color = 'bg-secondary';
        let text = status;
        
        switch (status) {
            case 'PENDING_PAYMENT': color = 'bg-warning text-dark'; text = 'Pendiente Pago'; break;
            case 'PAID': color = 'bg-info text-dark'; text = 'Pagado'; break;
            case 'SHIPPED': color = 'bg-primary text-white'; text = 'Enviado'; break;
            case 'DELIVERED': color = 'bg-success text-white'; text = 'Entregado'; break;
            case 'COMPLETED': color = 'bg-success text-white'; text = 'Completado'; break;
            case 'CANCELLED': color = 'bg-error text-white'; text = 'Cancelado'; break;
        }
        
        return `<span class="badge ${color}">${text}</span>`;
    }
})();
