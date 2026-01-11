/**
 * ReputationFlow
 * @role Orchestrator (Reputation)
 * @depends ReputationService
 */
window.ReputationFlow = (function() {

    /**
     * Load Reputation
     */
    async function loadReputation({ userId }) {
        return ReputationService.getReputation(userId);
    }

    /**
     * Submit Feedback
     */
    async function submitFeedback({ orderId, rating, comment }) {
        const res = await ReputationService.submit({ orderId, rating, comment });
        return res;
    }

    return {
        loadReputation,
        submitFeedback
    };
})();
