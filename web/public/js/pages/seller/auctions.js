/**
 * Iron Loot - Seller Auctions
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        if (!Auth.isSeller()) {
             window.location.href = '/profile';
             return;
        }
        loadAuctions();
    });

    async function loadAuctions() {
        const tbody = Utils.$('#sellerAuctionsTable');
        if (!tbody) return;

        try {
            // Note: Api.seller.getMyAuctions implementation depends on backend.
            // Assuming it returns list.
            const auctions = await Api.auctions.list({ sellerId: 'me' }); 
            // If API client doesn't support 'me' alias, we might need user ID.
            
            const data = auctions.data || auctions;
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-secondary">No tienes subastas creadas</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = data.map(auction => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                            <img src="${auction.images?.[0] || 'https://via.placeholder.com/40x40'}" 
                                 alt="${auction.title}" 
                                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                            <span class="fw-bold">${auction.title}</span>
                        </div>
                    </td>
                    <td>${Utils.formatCurrency(auction.currentPrice || auction.startingPrice)}</td>
                    <td>${auction.bidCount || 0}</td>
                    <td>${Utils.formatRelativeTime(auction.endsAt)}</td>
                    <td>${formatStatus(auction.status)}</td>
                    <td>
                        <a href="/auctions/${auction.slug || auction.id}" class="btn btn-secondary btn-sm">
                            Ver
                        </a>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load seller auctions:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-error">Error al cargar las subastas</td>
                </tr>
            `;
        }
    }
    
    function formatStatus(status) {
        let color = 'bg-secondary';
        switch (status) {
            case 'ACTIVE': color = 'bg-success text-white'; break;
            case 'CLOSED': color = 'bg-dark text-white'; break;
            case 'DRAFT': color = 'bg-warning text-dark'; break;
        }
        return `<span class="badge ${color}">${status}</span>`;
    }
})();
