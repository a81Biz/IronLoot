/**
 * Iron Loot - Create Auction
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        AuthState.waitForInit().then(init);
    });

    function init() {
        if (!AuthState.isSeller()) {
            Utils.toast('Debes ser vendedor para acceder a esta página', 'error');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
            return;
        }

        setupForm();
    }

    function setupForm() {
        const form = Utils.$('#createAuctionForm');
        const btn = Utils.$('#btnCreate');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Publicando...';

                try {
                    // Calculate Dates
                    const durationDays = parseInt(Utils.$('#duration').value);
                    const now = new Date();
                    
                    // Server handles 'now' better for start time, so we send only endsAt logic relative to it
                    // Or actually, if we want endsAt to be accurate relative to start... 
                    // Let's send NO startsAt (Backend handles it as NOW)
                    // And calculate endsAt based on Client NOW + Duration.
                    // This is acceptable as duration is large (Days).

                    const endsAt = new Date(now.getTime());
                    endsAt.setDate(endsAt.getDate() + durationDays);

                    const data = {
                        title: Utils.$('#title').value,
                        description: Utils.$('#description').value,
                        startingPrice: parseFloat(Utils.$('#startingPrice').value),
                        // startsAt: OMITTED -> Backend uses Server Time (Robust against clock skew)
                        endsAt: endsAt.toISOString(),
                        images: [Utils.$('#imageUrl').value]
                    };

                    // Use AuctionFlow to handle creation and redirect logic (e.g. to /edit if draft)
                    await AuctionFlow.createAuction(data);
                    
                    Utils.toast('Subasta creada y publicada', 'success');
                    // Redirect handled by Flow
                } catch (error) {
                    console.error('Create failed:', error);
                    Utils.toast(error.message || 'Error al crear la subasta', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">add_circle</span> Publicar Subasta';
                }
            });
        }
    }
})();
