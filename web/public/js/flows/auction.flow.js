/**
 * AuctionFlow
 * @role Orchestrator (Auctions & Bidding)
 * @depends AuctionService, BidService, WatchlistService, WalletFlow, Router
 */
window.AuctionFlow = (function() {
    
    /**
     * List Auctions
     * @param {Object} filters 
     */
    async function listAuctions(filters) {
        return AuctionService.list(filters);
    }

    /**
     * View Auction Detail
     * @param {string} auctionId 
     */
    async function viewAuctionDetail(auctionId) {
        const auction = await AuctionService.getById(auctionId);
        // We could load bids here too if needed, or let the page do it via Service if it's read-only
        // But Spec 10 says: "bids = await..., watch = await..."
        // Let's return a composite object or just the auction and let page load others?
        // Spec 10 implies Flow does it.
        
        let bids = [];
        let isWatched = false;
        
        try {
            // Parallel fetch for efficiency
            const [bidsRes, watchRes] = await Promise.allSettled([
                AuctionService.getBids(auctionId),
                WatchlistService.isWatched(auctionId) // This is synchronous in my impl, but let's assume async interface for future
            ]);
            
            if (bidsRes.status === 'fulfilled') bids = bidsRes.value;
            // WatchlistService.isWatched is currently synchronous set check. 
            isWatched = WatchlistService.isWatched(auctionId); 

        } catch (e) {
            console.warn('Failed to load extra auction details', e);
        }

        return { auction, bids, isWatched };
    }

    /**
     * Create Auction (Seller)
     * @param {Object} draftData 
     */
    async function createAuction(draftData) {
        // 1. Guard (Token Check)
        if (!AuthState.isSeller()) {
            throw new Error('Must be a seller');
        }

        // 2. Service
        const created = await AuctionService.create(draftData);
        
        // 3. Redirect
        // Spec 11: Redirect to edit (draft) or detail (published)
        // Note: Edit path not yet implemented in Controller, redirecting to Detail for now.
        const target = `/auctions/${created.id}`;
            
        window.location.href = target;
        return created;
    }

    async function updateAuction(id, data) {
        return AuctionService.update(id, data);
    }

    async function publishAuction(id) {
         return AuctionService.publish(id);
    }

    async function endAuction(id) {
         return AuctionService.end(id);
    }

    async function listSellerAuctions() {
         return AuctionService.listSellerAuctions();
    }

    async function listWonAuctions() {
         return AuctionService.listWon();
    }

    // placeBid delegation removed (Use BidFlow)

    return {
        listAuctions,
        viewAuctionDetail,
        createAuction,
        updateAuction,
        publishAuction,
        endAuction,
        listSellerAuctions,
        listWonAuctions
    };
})();
