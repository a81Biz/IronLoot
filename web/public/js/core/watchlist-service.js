/**
 * Iron Loot - Watchlist Service
 * Handles local watchlist storage for MVP.
 */

const WatchlistService = (function() {
    let watchedIds = new Set();
    let initialized = false;

    /**
     * Sync with backend
     */
    async function init() {
        if (initialized) return;
        await sync();
        initialized = true;
    }

    /**
     * Force sync
     */
    async function sync() {
        if (!Auth.isLoggedIn()) return;
        try {
            const items = await Api.watchlist.list();
            watchedIds = new Set(items.map(i => i.auctionId));
            window.dispatchEvent(new CustomEvent('watchlist:updated', { detail: [...watchedIds] }));
        } catch (e) {
            console.error('Failed to sync watchlist', e);
        }
    }

    /**
     * Add auction to watchlist
     */
    async function add(auctionId) {
        try {
            await Api.watchlist.add(auctionId);
            watchedIds.add(auctionId);
            window.dispatchEvent(new CustomEvent('watchlist:updated', { detail: [...watchedIds] }));
            return true;
        } catch (e) {
            console.error('Failed to add to watchlist', e);
            return false;
        }
    }

    /**
     * Remove auction from watchlist
     */
    async function remove(auctionId) {
        try {
            await Api.watchlist.remove(auctionId);
            watchedIds.delete(auctionId);
            window.dispatchEvent(new CustomEvent('watchlist:updated', { detail: [...watchedIds] }));
            return true;
        } catch (e) {
            console.error('Failed to remove from watchlist', e);
            return false;
        }
    }

    /**
     * Toggle auction in watchlist
     */
    async function toggle(auctionId) {
        if (isWatched(auctionId)) {
            await remove(auctionId);
            return false; // removed
        } else {
            await add(auctionId);
            return true; // added
        }
    }

    /**
     * Check if auction is watched
     */
    function isWatched(auctionId) {
        return watchedIds.has(auctionId);
    }

    /**
     * Get all watched IDs
     */
    function list() {
        return [...watchedIds];
    }

    return {
        init,
        sync,
        add,
        remove,
        toggle,
        isWatched,
        list
    };
})();
