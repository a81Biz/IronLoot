/**
 * OrderFlow
 * @role Orchestrator (Orders)
 * @depends OrderService
 */
window.OrderFlow = (function() {

    /**
     * Load Buyer Orders
     */
    async function loadOrders() {
        return OrderService.listMine();
    }

    /**
     * Load Order Detail
     */
    async function loadOrderDetail(orderId) {
        return OrderService.getById(orderId);
    }

    /**
     * Load Seller Orders
     */
    async function sellerLoadOrders() {
        if (!AuthState.isSeller()) throw new Error('Not a seller');
        return OrderService.listSellerOrders();
    }

    /**
     * Update Order Status (Seller)
     */
    async function updateOrderStatus({ orderId, status, tracking }) {
        if (!AuthState.isSeller()) throw new Error('Not a seller');
        const res = await OrderService.updateStatus(orderId, { status, tracking });
        return res;
    }

    /**
     * Confirm Received (Buyer)
     */
    async function confirmReceived({ orderId }) {
        const res = await OrderService.confirmReceived(orderId);
        return res;
    }

    async function cancelOrder({ orderId }) {
        return OrderService.cancel(orderId);
    }

    return {
        loadOrders,
        loadOrderDetail,
        sellerLoadOrders,
        updateOrderStatus,
        confirmReceived,
        cancelOrder
    };
})();
