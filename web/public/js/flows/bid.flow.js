/**
 * BidFlow
 * @role Orchestrator (Bidding)
 * @description Handles bidding interactions and real-time updates.
 * @depends AuctionService, WalletFlow, NotificationService
 */
window.BidFlow = (function() {

    /**
     * Place Bid
     * @param {Object} params 
     * @param {string} params.auctionId
     * @param {number} params.amount
     */
    async function placeBid({ auctionId, amount }) {
        // 1. Validation
        if (!AuthState.isLoggedIn()) {
             // Redirect to login or throw
             window.location.href = `/login?return=/auctions/${auctionId}`;
             return;
        }

        try {
            // 2. Service Call
            const res = await AuctionService.placeBid(auctionId, { amount });

            // 3. Sync Wallet (Funds held)
            if (window.WalletFlow) {
                await WalletFlow.syncAfterMutation();
            }

            // 4. Return result for UI update
            // UI should assume success and re-fetch auction/bids to show new state
            return res;

        } catch (error) {
            console.error('[BidFlow] Bid failed', error);
            throw error;
        }
    }

    /**
     * Handle Outbid (e.g. from WebSocket or Polling)
     * @param {string} auctionId 
     */
    async function handleOutbid(auctionId) {
        // 1. Refresh Auction Status
        // UI should show "Outbid" badge
        // This might arguably trigger a UI event rather than returning
        window.dispatchEvent(new CustomEvent('auction:outbid', { detail: { auctionId } }));
    }

    async function loadMyBids() {
        return AuctionService.listMyBids();
    }

    return {
        placeBid,
        handleOutbid,
        loadMyBids
    };
})();
