/**
 * WatchlistFlow
 * @role Orchestrator (Favorites)
 * @depends WatchlistService
 */
window.WatchlistFlow = (function() {
    
    /**
     * Toggle Watchlist Status
     * @param {string} auctionId 
     */
    async function toggle({ auctionId }) {
        if (!AuthState.isLoggedIn()) {
             window.location.href = `/login?return=${window.location.pathname}`;
             return;
        }

        await WatchlistService.toggle(auctionId);
        // WatchlistService emits 'watchlist:updated' which UI listens to.
        return true;
    }

    /**
     * Load Watchlist
     */
    async function loadList() {
        return WatchlistService.list();
    }

    return {
        toggle,
        loadList
    };
})();
