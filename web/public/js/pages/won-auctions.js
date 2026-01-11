/**
 * Iron Loot - Won Auctions List
 * Fetches data from /api/web-views/won-auctions (Derived View)
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadWonAuctions();
    });

    async function loadWonAuctions() {
        const tbody = Utils.$('#wonAuctionsTable');
        if (!tbody) return;

        try {
            // Using the API endpoint we created in the previous step
            // WebViewsController: GET /api/web-views/won-auctions
            // The proxy in main.ts redirects /api requests to the backend
            const response = await fetch('/api/web-views/won-auctions', {
                headers: {
                    'Authorization': `Bearer ${Utils.getToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch won auctions');
            const orders = await response.json();
            
            if (!orders || orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-secondary">No has ganado subastas todavía.</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td class="font-mono text-sm">${order.id.substring(0, 8)}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: var(--spacing-3);">
                            <img src="${Utils.escapeHtml(getImage(order))}" 
                                 alt="Item" 
                                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                            <span class="fw-bold">${Utils.escapeHtml(order.auction?.title || 'Artículo Desconocido')}</span>
                        </div>
                    </td>
                    <td>${Utils.formatCurrency(order.totalAmount)}</td>
                    <td>${Utils.formatRelativeTime(order.createdAt)}</td>
                    <td>
                        <a href="/orders/${order.id}" class="btn btn-primary btn-sm">
                            Ver Orden
                        </a>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load won auctions:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-error">Error al cargar las subastas ganadas</td>
                </tr>
            `;
        }
    }

    function getImage(order) {
        // Fallback for image logic, assuming auction data might have images or use placeholder
        return 'https://via.placeholder.com/40x40'; 
    }

})();
