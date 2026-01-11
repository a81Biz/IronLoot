/**
 * ReputationService
 * @role API Wrapper (Domain: Reputation)
 */
window.ReputationService = (function() {

    async function getReputation(userId) {
        const { data } = await Api.get(`/users/${userId}/reputation`);
        return data;
    }

    async function submit({ orderId, rating, comment }) {
        const { data } = await Api.post(`/orders/${orderId}/feedback`, { rating, comment });
        return data;
    }

    return {
        getReputation,
        submit
    };
})();
