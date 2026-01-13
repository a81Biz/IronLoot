/**
 * OrderService
 * @role API Wrapper (Domain: Orders)
 */
window.OrderService = (function() {

    async function listMine() {
        const { data } = await Api.get(ApiRoutes.orders.list);
        return data; // List of orders
    }

    async function getById(params) {
        // params can be an object or id string depending on usage.
        // Flow used `getById(orderId)`.
        const id = typeof params === 'object' ? params.id : params;
        const { data } = await Api.get(ApiRoutes.orders.detail(id));
        return data;
    }

    async function listSellerOrders() {
        const { data } = await Api.get(ApiRoutes.orders.sellerOrders);
        return data;
    }

    async function updateStatus(orderId, { status, tracking }) {
        const { data } = await Api.patch(ApiRoutes.orders.updateStatus(orderId), { status, tracking });
        return data;
    }

    async function confirmReceived(orderId) {
         const { data } = await Api.post(ApiRoutes.orders.confirmReceived(orderId));
         return data;
    }

    async function cancel(orderId) {
         const { data } = await Api.post(ApiRoutes.orders.cancel(orderId));
         return data;
    }

    return {
        listMine,
        getById,
        listSellerOrders,
        updateStatus,
        confirmReceived,
        cancel
    };
})();
