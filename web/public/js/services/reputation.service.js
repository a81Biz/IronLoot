/**
 * ReputationService
 * @role API Wrapper (Domain: Reputation)
 */
window.ReputationService = (function() {

    async function getReputation(userId) {
        const { data } = await Api.get(ApiRoutes.ratings.listByUser(userId));
        return data;
    }

    async function submit({ orderId, rating, comment }) {
        // Warning: This endpoint matches 'create' in controller /ratings, 
        // but extracting 'orderId' into body might be needed or logic handles it.
        // Original logic: Api.post(`/orders/${orderId}/feedback`, ...).
        // My ApiRoutes has: ratings.create -> /ratings.
        // Controller RatingsController has: @Post('ratings') -> create(dto).
        // It does NOT have /orders/:id/feedback.
        // So I must change the path here to /ratings and put orderId in the body if the DTO supports it.
        // Assuming current JS is legacy/wrong and I must fix it to use standard /ratings.
        // Or if the backend strictly requires /orders/:id/feedback, then RatingsController was missing it.
        // But I verified RatingsController and it ONLY has @Post('ratings').
        // So I will use ApiRoutes.ratings.create AND change the logic to send orderId in body.
        const { data } = await Api.post(ApiRoutes.ratings.create, { orderId, score: rating, comment });
        return data;
    }

    return {
        getReputation,
        submit
    };
})();
