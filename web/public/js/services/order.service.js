/**
 * OrderService
 * @role API Wrapper (Domain: Orders)
 */
window.OrderService = (function() {

    async function listMine() {
        const { data } = await Api.get('/orders');
        return data; // List of orders
    }

    async function getById(params) {
        // params can be an object or id string depending on usage.
        // Flow used `getById(orderId)`.
        const id = typeof params === 'object' ? params.id : params;
        const { data } = await Api.get(`/orders/${id}`);
        return data;
    }

    async function listSellerOrders() {
        const { data } = await Api.get('/orders/seller-orders');
        return data;
    }

    async function updateStatus(orderId, { status, tracking }) {
        const { data } = await Api.patch(`/orders/${orderId}/status`, { status, tracking });
        return data;
    }

    async function confirmReceived(orderId) {
         const { data } = await Api.post(`/orders/${orderId}/confirm-receipt`);
         return data;
    }

    async function cancel(orderId) {
         const { data } = await Api.post(`/orders/${orderId}/cancel`);
         return data;
    }

    return {
        listMine,
        getById,
        listSellerOrders,
        updateStatus,
        updateStatus,
        confirmReceived,
        cancel
    };
})();
