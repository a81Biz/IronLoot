/**
 * Iron Loot - Watchlist
 * Implements Spec v0.2.3: API-based watchlist (No localStorage)
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadWatchlist();
    });

    async function loadWatchlist() {
        const grid = Utils.$('#watchlistGrid');
        const emptyState = Utils.$('#emptyState');
        
        if (!grid) return;

        grid.innerHTML = '<p class="col-span-full text-center">Cargando subastas...</p>';
        emptyState.classList.add('hidden');

        try {
            // 1. Fetch from API using Client (handles headers)
            const watchListItems = await Api.watchlist.list();

            // 2. Check if empty
            if (!watchListItems || watchListItems.length === 0) {
                grid.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            // 3. Render using embedded auction data
            const auctions = watchListItems
                .filter(item => item.auction) // Integrity check
                .map(item => item.auction);

            if (auctions.length === 0) {
                 grid.innerHTML = '';
                 emptyState.classList.remove('hidden');
                 return;
            }

            grid.innerHTML = auctions.map(auction => createAuctionCard(auction)).join('');

        } catch (error) {
            console.error('Failed to load watchlist:', error);
            if (error.statusCode === 401) {
                 window.location.href = '/login?return=/watchlist';
                 return;
            }
            grid.innerHTML = `<p class="text-error col-span-full">Error al cargar tu watchlist. Por favor intenta de nuevo.</p>`;
        }
    }

    function createAuctionCard(auction) {
        // Reuse card HTML structure, verify image property exists
        const imageUrl = (auction.images && auction.images.length > 0) 
            ? auction.images[0] 
            : `https://via.placeholder.com/300x200?text=${encodeURIComponent(auction.title)}`;

        return `
            <div class="card auction-card" id="card-${auction.id}">
                <div class="card-media" style="height: 160px; background: #eee;">
                    <img src="${imageUrl}" 
                         alt="${auction.title}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="card-body">
                    <h3 class="card-title h5 text-truncate">${auction.title}</h3>
                    <p class="text-primary font-bold mb-2">${Utils.formatCurrency(auction.currentPrice)}</p>
                    <div class="flex justify-between items-center">
                        <a href="/auctions/${auction.id}" class="btn btn-outline btn-sm w-full">Ver</a>
                        <button class="btn btn-icon btn-sm text-error" onclick="removeFromWatchlist('${auction.id}')" title="Eliminar">
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Expose remove function globally
    window.removeFromWatchlist = async function(auctionId) {
        if (!confirm('¿Eliminar de tu watchlist?')) return;

        try {
            await Api.watchlist.remove(auctionId);

            // Remove from DOM immediately on success
            const card = document.getElementById(`card-${auctionId}`);
            if (card) {
                card.remove();
                
                // Check if grid is empty now
                const grid = Utils.$('#watchlistGrid');
                if (grid && grid.children.length === 0) {
                    Utils.show('#emptyState');
                }
            }
            
            Utils.toast('Eliminado de watchlist', 'success');

        } catch (error) {
            console.error('Remove failed:', error);
            Utils.toast('Error al eliminar', 'error');
        }
    };

})();
