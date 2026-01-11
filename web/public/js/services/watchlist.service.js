/**
 * WatchlistService
 * @role API Wrapper + State (Domain: Watchlist)
 * @description Manages user's watchlist (favorites).
 */
window.WatchlistService = (function() {
    
    let watchedIds = new Set();
    let isInitialized = false;

    async function init() {
        if (!Api.isAuthenticated()) return;
        if (isInitialized) return;

        try {
            const { data } = await Api.get('/watchlist');
            // Assuming data is array of objects { id, ... } or { auctionId, ... }
            // API usually returns list of auctions orwatchlist items.
            // Let's assume list of auctions or objects with auctionId.
            // We need to know the structure. 
            // Previous 'api-client.js' had `async list() { const { data } = await request('GET', '/watchlist'); return data; }`
            
            // Let's map whatever we get to IDs.
            if (Array.isArray(data)) {
                // If it returns Auction objects:
                watchedIds = new Set(data.map(item => item.id || item.auctionId));
            }
            isInitialized = true;
             // Notify that watchlist is ready/updated
            window.dispatchEvent(new CustomEvent('watchlist:updated'));
        } catch (e) {
            console.warn('[WatchlistService] Init failed', e);
        }
    }

    async function list() {
        // Returns full objects
        const { data } = await Api.get('/watchlist');
        return data; 
    }

    async function add(auctionId) {
        await Api.post('/watchlist', { auctionId });
        watchedIds.add(auctionId);
        window.dispatchEvent(new CustomEvent('watchlist:updated'));
    }

    async function remove(auctionId) {
        await Api.delete(`/watchlist/${auctionId}`);
        watchedIds.delete(auctionId);
        window.dispatchEvent(new CustomEvent('watchlist:updated'));
    }

    async function toggle(auctionId) {
        if (!Api.isAuthenticated()) {
            window.location.href = `/login?return=${window.location.pathname}`;
            return;
        }

        if (watchedIds.has(auctionId)) {
            await remove(auctionId);
        } else {
            await add(auctionId);
        }
    }

    function isWatched(auctionId) {
        return watchedIds.has(auctionId);
    }

    return {
        init,
        list,
        add,
        remove,
        toggle,
        isWatched
    };
})();
