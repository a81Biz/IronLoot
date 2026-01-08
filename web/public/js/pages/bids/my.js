/**
 * Iron Loot - My Bids Page
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadActiveBids();
    });

    async function loadActiveBids() {
        const tbody = Utils.$('#activeBidsTable');
        if (!tbody) return;

        try {
            const bids = await Api.bids.getMyActiveBids();
            
            if (!bids || bids.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-secondary">No tienes pujas activas actualmente</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = bids.map(bid => {
                const isWinning = bid.status === 'WINNING';
                const auction = bid.auction || {};
                
                return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                            <img src="${auction.images?.[0] || 'https://via.placeholder.com/40x40'}" 
                                 alt="${auction.title}" 
                                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                            <div>
                                <a href="/auctions/${auction.slug || auction.id || '#'}" class="fw-bold text-decoration-none text-dark">
                                    ${auction.title || 'Subasta desconocida'}
                                </a>
                            </div>
                        </div>
                    </td>
                    <td class="fw-bold">${Utils.formatCurrency(bid.amount)}</td>
                    <td>${Utils.formatCurrency(bid.currentPrice || bid.amount)}</td>
                    <td>${auction.endsAt ? Utils.formatRelativeTime(auction.endsAt) : '-'}</td>
                    <td>
                        <span class="badge ${isWinning ? 'bg-success' : 'bg-warning text-dark'}">
                            ${isWinning ? 'Ganando' : 'Superado'}
                        </span>
                    </td>
                    <td>
                        <a href="/auctions/${auction.slug || auction.id || '#'}" class="btn btn-secondary btn-sm">
                            Ver
                        </a>
                    </td>
                </tr>
            `}).join('');

        } catch (error) {
            console.error('Failed to load bids:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-error">Error al cargar las pujas</td>
                </tr>
            `;
        }
    }
})();
