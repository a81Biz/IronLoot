/**
 * Iron Loot - Edit Auction
 */

(function() {
    // Auction ID injected from template
    const auctionId = window.AUCTION_ID;

    document.addEventListener('DOMContentLoaded', () => {
        AuthState.waitForInit().then(init);
    });

    async function init() {
        if (!AuthState.isSeller()) {
            Utils.toast('Debes ser vendedor para acceder a esta página', 'error');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
            return;
        }

        if (!auctionId) {
            Utils.toast('Error: ID de subasta no encontrado', 'error');
            return;
        }

        await loadAuctionData();
        setupForm();
    }

    async function loadAuctionData() {
        try {
            // Load auction details
            const auction = await AuctionService.getById(auctionId);
            
            // Populate form fields
            Utils.val('#title', auction.title);
            Utils.val('#description', auction.description);
            Utils.val('#startingPrice', auction.startingPrice);
            
            // Handle images (array) - take first one for MVP input
            const firstImage = auction.images && auction.images.length > 0 ? auction.images[0] : '';
            Utils.val('#imageUrl', firstImage);

        } catch (error) {
            console.error('Failed to load auction:', error);
            Utils.toast('Error al cargar la información de la subasta', 'error');
        }
    }

    function setupForm() {
        const form = Utils.$('#editAuctionForm');
        const btn = Utils.$('#btnSave');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Guardando...';

                try {
                    const data = {
                        title: Utils.$('#title').value,
                        description: Utils.$('#description').value,
                        startingPrice: parseFloat(Utils.$('#startingPrice').value),
                        images: [Utils.$('#imageUrl').value]
                    };

                    await AuctionService.update(auctionId, data);
                    
                    Utils.toast('Subasta actualizada exitosamente', 'success');
                    setTimeout(() => {
                        window.location.href = '/seller/auctions';
                    }, 1000);

                } catch (error) {
                    console.error('Update failed:', error);
                    Utils.toast(error.message || 'Error al actualizar', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar Cambios';
                }
            });
        }
    }
})();
