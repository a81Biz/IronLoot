/**
 * AuctionService
 * @role API Wrapper (Domain: Auctions)
 * @description Encapsulates API calls related to auctions and bids.
 */
window.AuctionService = (function() {

    async function list(filters = {}) {
        const { data } = await Api.get('/auctions', { params: filters });
        return data; // Returns list
    }

    async function getById(id) {
        const { data } = await Api.get(`/auctions/${id}`);
        return data; // Returns auction detail
    }

    async function create(auctionData) {
        const { data } = await Api.post('/auctions', auctionData);
        return data;
    }

    async function update(id, auctionData) {
        const { data } = await Api.patch(`/auctions/${id}`, auctionData);
        return data;
    }

    async function publish(id) {
        const { data } = await Api.post(`/auctions/${id}/publish`);
        return data;
    }

    async function placeBid(auctionId, amount) {
        const { data } = await Api.post(`/auctions/${auctionId}/bids`, { amount });
        return data;
    }

    async function listMyBids() {
        const { data } = await Api.get('/auctions/my-bids'); // Assuming endpoint
        return data;
    }

    async function getBids(auctionId) {
        const { data } = await Api.get(`/auctions/${auctionId}/bids`);
        return data;
    }

    async function end(id) {
        const { data } = await Api.post(`/auctions/${id}/end`);
        return data;
    }

    async function listSellerAuctions() {
        // Assuming endpoint /seller/auctions or /auctions?filter=seller
        const { data } = await Api.get('/seller/auctions');
        return data;
    }

    async function listWon() {
        const { data } = await Api.get('/auctions/won');
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
