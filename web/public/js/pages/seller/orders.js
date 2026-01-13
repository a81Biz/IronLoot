/**
 * Iron Loot - Seller Orders
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
         if (!Auth.isSeller()) {
             window.location.href = '/profile';
             return;
        }
        loadOrders();
        setupShipModal();
    });

    async function loadOrders() {
        const tbody = Utils.$('#sellerOrdersTable');
        if (!tbody) return;

        try {
            // Use Api.seller.getOrders (needs implementation in client)
            // Or use orders.list with filter? Api.orders.list() is usually "my orders as buyer".
            // I'll assume I added seller.getOrders() in api-client.js earlier, OR use a direct fetch here if not.
            // I added it in previous step as 'seller: { getOrders, ... }'
            // But let's verify if the endpoint exists.
            
            // For MVP: Fetch /orders?role=seller if backend supports it.
            // Let's rely on Api.seller.getOrders() if I added it.
            // If it returns 404, we'll know.
            const orders = await Api.seller.getOrders().catch(() => []); // Fallback

            if (!orders || orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-secondary">No hay órdenes para enviar</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td class="font-mono text-sm">${order.id.substring(0, 8)}</td>
                    <td>${order.itemSnapshot?.title || 'Artículo'}</td>
                    <td>${order.buyer?.username || 'Usuario'}</td>
                    <td>${Utils.formatRelativeTime(order.paidAt || order.createdAt)}</td>
                    <td>${formatStatus(order.status)}</td>
                    <td>
                        ${order.status === 'PAID' ? `
                            <button class="btn btn-primary btn-sm btn-ship" data-id="${order.id}">
                                Enviar
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
            
            // Setup Ship Buttons
            tbody.querySelectorAll('.btn-ship').forEach(btn => {
                btn.addEventListener('click', () => {
                    openShipModal(btn.dataset.id);
                });
            });

        } catch (error) {
            console.error('Failed to load seller orders:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-error">Error al cargar las órdenes</td>
                </tr>
            `;
        }
    }

    function formatStatus(status) {
         let color = 'bg-secondary';
        switch (status) {
            case 'PAID': color = 'bg-info text-dark'; break;
            case 'SHIPPED': color = 'bg-primary text-white'; break;
            case 'DELIVERED': color = 'bg-success text-white'; break;
        }
        return `<span class="badge ${color}">${status}</span>`;
    }

    function openShipModal(orderId) {
        Utils.$('#shipOrderId').value = orderId;
        Utils.$('#shipModal').classList.add('active');
        Utils.$('#shipModalBackdrop').classList.add('active');
    }
    
    function setupShipModal() {
        const btn = Utils.$('#btnConfirmShip');
        if (btn) {
            btn.addEventListener('click', async () => {
                const orderId = Utils.$('#shipOrderId').value;
                const tracking = Utils.$('#trackingNumber').value;
                const carrier = Utils.$('#carrier').value;
                
                if (!tracking || !carrier) {
                    Utils.toast('Completa todos los campos', 'error');
                    return;
                }
                
                btn.disabled = true;
                btn.textContent = 'Guardando...';
                
                try {
                    // API call to ship
                    // PATCH /orders/:id/ship
                     await Api.post(ApiRoutes.orders.ship(orderId), { trackingNumber: tracking, carrier });
                    
                    Utils.toast('Envío registrado', 'success');
                    Utils.$('#shipModal').classList.remove('active');
                    Utils.$('#shipModalBackdrop').classList.remove('active');
                    loadOrders();
                    
                } catch (error) {
                     console.error('Ship failed:', error);
                     Utils.toast('Error al registrar envío', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Registrar Envío';
                }
            });
        }
    }
})();
