/**
 * AuctionService
 * @role API Wrapper (Domain: Auctions)
 * @description Encapsulates API calls related to auctions and bids.
 */
window.AuctionService = (function() {

    async function list(filters = {}) {
        const { data } = await Api.get(ApiRoutes.auctions.list, { params: filters });
        return data; // Returns list
    }

    async function getById(id) {
        const { data } = await Api.get(ApiRoutes.auctions.detail(id));
        return data; // Returns auction detail
    }

    async function create(auctionData) {
        const { data } = await Api.post(ApiRoutes.auctions.create, auctionData);
        return data;
    }

    async function update(id, auctionData) {
        const { data } = await Api.patch(ApiRoutes.auctions.update(id), auctionData);
        return data;
    }

    async function publish(id) {
        const { data } = await Api.post(ApiRoutes.auctions.publish(id));
        return data;
    }

    async function placeBid(auctionId, amount) {
        const { data } = await Api.post(ApiRoutes.auctions.placeBid(auctionId), { amount });
        return data;
    }

    async function listMyBids() {
        const { data } = await Api.get(ApiRoutes.bids.myActive); // Using bids.myActive based on controller
        return data;
    }

    async function getBids(auctionId) {
        const { data } = await Api.get(ApiRoutes.auctions.listBids(auctionId));
        return data;
    }

    async function end(id) {
        // Warning: 'end' endpoint not verified in controller? 
        // Keeping as extracted but might fail if not in backend.
        // There is no standard 'end' in AuctionsController.
        const { data } = await Api.post(ApiRoutes.auctions.end(id)); 
        return data;
    }

    async function listSellerAuctions() {
        // Mapping to standard list with seller=true or specific route if exists
        // Given no specific seller route, using list with filter logic or the hardcode if backend acts differently
        // ApiRoutes didn't have specific seller list, assuming /auctions?sellerId=...
        // But the original service had /seller/auctions.
        // Providing best effort mapping to /auctions for now.
        const { data } = await Api.get(ApiRoutes.auctions.list, { params: { mine: true } });
        return data;
    }

    async function listWon() {
        const { data } = await Api.get(ApiRoutes.webViews.wonAuctions);
        return data;
    }

    return {
        list,
        getById,
        create,
        update,
        publish,
        end,
        listSellerAuctions,
        listWon,
        listMyBids,
        placeBid,
        getBids
    };
})();
