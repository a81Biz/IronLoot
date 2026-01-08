/**
 * Iron Loot - Order Detail
 */

(function() {
    let currentOrder = null;

    document.addEventListener('DOMContentLoaded', () => {
        loadOrder();
        setupPaymentModal();
    });

    async function loadOrder() {
        // Get ID from URL
        const pathParts = window.location.pathname.split('/');
        const orderId = pathParts[pathParts.length - 1];

        try {
            currentOrder = await Api.orders.getById(orderId);
            renderOrder();
        } catch (error) {
            console.error('Failed to load order:', error);
            Utils.toast('Error al cargar la orden', 'error');
        }
    }

    function renderOrder() {
        if (!currentOrder) return;

        Utils.$('#orderNumber').textContent = currentOrder.id.substring(0, 8);
        Utils.$('#orderDate').textContent = Utils.formatRelativeTime(currentOrder.createdAt);
        Utils.$('#orderTitle').textContent = currentOrder.itemSnapshot?.title || 'Artículo';
        Utils.$('#orderSeller').textContent = `Vendedor: ${currentOrder.seller?.username || 'Desconocido'}`;
        Utils.$('#orderTotal').textContent = Utils.formatCurrency(currentOrder.total);
        
        if (currentOrder.itemSnapshot?.images?.[0]) {
            Utils.$('#orderImage').src = currentOrder.itemSnapshot.images[0];
        }

        renderStatus(currentOrder.status);
        renderActions(currentOrder.status);
        
        if (['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(currentOrder.status)) {
            Utils.show('#shippingSection');
            // Mock address if not present
            Utils.$('#shippingAddress').textContent = currentOrder.shippingAddress || 'Calle Falsa 123, Ciudad Test';
            Utils.$('#shippingTracking').textContent = currentOrder.trackingNumber || 'Pendiente de envío';
        } else {
            Utils.hide('#shippingSection');
        }
    }
    
    function renderStatus(status) {
        const el = Utils.$('#orderStatus');
        let color = 'bg-secondary';
        let text = status;
        
        switch (status) {
            case 'PENDING_PAYMENT': color = 'bg-warning text-dark'; text = 'Pendiente de Pago'; break;
            case 'PAID': color = 'bg-info text-dark'; text = 'Pagado'; break;
            case 'SHIPPED': color = 'bg-primary text-white'; text = 'Enviado'; break;
            case 'DELIVERED': color = 'bg-success text-white'; text = 'Entregado'; break;
            case 'COMPLETED': color = 'bg-success text-white'; text = 'Completado'; break;
            case 'CANCELLED': color = 'bg-error text-white'; text = 'Cancelado'; break;
        }
        
        el.className = `badge ${color}`;
        el.textContent = text;
    }

    function renderActions(status) {
        const container = Utils.$('#actionSection');
        container.innerHTML = '';

        if (status === 'PENDING_PAYMENT') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-block';
            btn.innerHTML = '<span class="material-symbols-outlined">credit_card</span> Pagar Ahora';
            btn.onclick = openPaymentModal;
            container.appendChild(btn);
        } else if (status === 'SHIPPED') {
             const btn = document.createElement('button');
            btn.className = 'btn btn-success btn-block';
            btn.innerHTML = '<span class="material-symbols-outlined">check</span> Confirmar Recepción';
            // TODO: active confirm endpoint
            container.appendChild(btn);
        } else {
            container.innerHTML = '<p class="text-center text-secondary">No hay acciones pendientes</p>';
        }
    }

    function setupPaymentModal() {
        const modal = Utils.$('#paymentModal');
        const btnConfirm = Utils.$('#btnConfirmPayment');
        
        // Modal open handled by data-modal-open or manual class toggle.
        // We handle manual opening in openPaymentModal.
        
        if (btnConfirm) {
            btnConfirm.addEventListener('click', async () => {
                if (!currentOrder) return;
                
                btnConfirm.disabled = true;
                btnConfirm.textContent = 'Procesando...';
                
                try {
                    await Api.orders.pay(currentOrder.id);
                    Utils.toast('Pago realizado con éxito', 'success');
                    
                    // Close modal and reload
                    modal.classList.remove('active');
                    Utils.$('#paymentModalBackdrop').classList.remove('active');
                    
                    loadOrder();
                    
                } catch (error) {
                    console.error('Payment failed:', error);
                    Utils.toast(error.message || 'Error al procesar el pago', 'error');
                } finally {
                    btnConfirm.disabled = false;
                    btnConfirm.textContent = 'Confirmar Pago';
                }
            });
        }
    }
    
    function openPaymentModal() {
        if (!currentOrder) return;
        Utils.$('#paymentAmount').textContent = Utils.formatCurrency(currentOrder.total);
        
        Utils.$('#paymentModal').classList.add('active');
        Utils.$('#paymentModalBackdrop').classList.add('active');
    }

})();
