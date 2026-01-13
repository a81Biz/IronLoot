/**
 * Iron Loot - Seller Auctions
 */

(function() {
    let currentPage = 1;
    const limit = 10;

    document.addEventListener('DOMContentLoaded', async () => {
        await AuthState.waitForInit();
        
        // Use AuthState instead of Auth
        if (!AuthState.isSeller()) {
             window.location.href = '/profile';
             return;
        }

        loadAuctions();
        setupFilters();
    });

    function setupFilters() {
        const searchInput = Utils.$('#filterSearch');
        const statusSelect = Utils.$('#filterStatus');
        const sortSelect = Utils.$('#filterSort');

        const inputs = [searchInput, statusSelect, sortSelect];

        inputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    currentPage = 1;
                    loadAuctions();
                });
                if (input.tagName === 'INPUT') {
                     input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            currentPage = 1;
                            loadAuctions();
                        }
                    });
                }
            }
        });
    }

    function getFilters() {
        return {
            search: Utils.$('#filterSearch')?.value || undefined,
            status: Utils.$('#filterStatus')?.value || undefined,
            sort: Utils.$('#filterSort')?.value || undefined,
            mine: true,
            page: currentPage,
            limit: limit
        };
    }

    async function loadAuctions() {
        const tbody = Utils.$('#sellerAuctionsTable');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary">Cargando subastas...</td></tr>`;

        try {
            const filters = getFilters();
            // Validate mine=true is present as per user requirement
            if (!filters.mine) filters.mine = true;

            // AuctionService.list returns { data: [], total: ... }
            const response = await AuctionService.list(filters);
            const auctions = response.data || [];
            
            // Check for empty array
            if (!auctions || auctions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: var(--spacing-8);">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-4);">
                                <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">storefront</span>
                                <p class="text-secondary">No has creado subastas aún</p>
                                <a href="/auction/create" class="btn btn-primary">
                                    <span class="material-symbols-outlined">add</span>
                                    Crear Subasta
                                </a>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = auctions.map(auction => {
                const isDraft = auction.status === 'DRAFT';
                const isPublished = auction.status === 'PUBLISHED' || auction.status === 'ACTIVE';
                const isVisible = isPublished ? 'Sí' : 'No';
                
                return `
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
                    <td>
                        ${isDraft 
                            ? Utils.formatDuration(new Date(auction.endsAt) - new Date(auction.startsAt)) 
                            : Utils.formatDate(auction.endsAt, { hour: '2-digit', minute: '2-digit' })
                        }
                    </td>
                    <td>${formatStatus(auction.status)}</td>
                    <td>
                        <span class="badge ${isPublished ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                            ${isVisible}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; gap: var(--spacing-2);">
                            ${isDraft ? `
                                <a href="/auction/${auction.id}/edit" class="btn btn-secondary btn-sm" title="Editar">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                </a>
                                <button class="btn btn-success btn-sm btn-publish" data-id="${auction.id}" title="Publicar">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">publish</span>
                                </button>
                            ` : `
                                <a href="/auctions/${auction.id}" class="btn btn-secondary btn-sm" title="Ver Detalle">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
                                </a>
                            `}
                        </div>
                    </td>
                </tr>
            `}).join('');

            // Attach listeners for Publish buttons
            tbody.querySelectorAll('.btn-publish').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (confirm('¿Estás seguro de que deseas publicar esta subasta?')) {
                        try {
                            btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 16px;">refresh</span>';
                            await AuctionService.publish(id);
                            Utils.toast('Subasta publicada exitosamente', 'success');
                            loadAuctions();
                        } catch(err) {
                            Utils.toast(err.message || 'Error al publicar', 'error');
                            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">publish</span>';
                        }
                    }
                });
            });

        } catch (error) {
            console.error('Failed to load seller auctions:', error);
            
            // Handle 401 specifically
            if (error.status === 401 || (error.response && error.response.status === 401)) {
                window.location.href = '/login?return=/seller/auctions';
                return;
            }

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-error">
                        Error al cargar las subastas. <button class="btn-link" onclick="location.reload()">Reintentar</button>
                    </td>
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
            case 'PUBLISHED': color = 'bg-info text-white'; break;
        }
        return `<span class="badge ${color}">${status}</span>`;
    }
})();
