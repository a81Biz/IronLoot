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
            const { data } = await Api.get(ApiRoutes.watchlist.list);
            
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
        const { data } = await Api.get(ApiRoutes.watchlist.list);
        return data; 
    }

    async function add(auctionId) {
        await Api.post(ApiRoutes.watchlist.add, { auctionId });
        watchedIds.add(auctionId);
        window.dispatchEvent(new CustomEvent('watchlist:updated'));
    }

    async function remove(auctionId) {
        await Api.delete(ApiRoutes.watchlist.remove(auctionId));
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
