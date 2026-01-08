/**
 * Iron Loot - Create Auction
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        if (!Auth.isSeller()) {
            Utils.toast('Debes ser vendedor para acceder a esta página', 'error');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 2000);
            return;
        }

        setupForm();
    });

    function setupForm() {
        const form = Utils.$('#createAuctionForm');
        const btn = Utils.$('#btnCreate');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Publicando...';

                try {
                    // Calculate End Date
                    const durationDays = parseInt(Utils.$('#duration').value);
                    const endsAt = new Date();
                    endsAt.setDate(endsAt.getDate() + durationDays);

                    const data = {
                        title: Utils.$('#title').value,
                        description: Utils.$('#description').value,
                        startingPrice: parseFloat(Utils.$('#startingPrice').value),
                        endsAt: endsAt.toISOString(),
                        images: [Utils.$('#imageUrl').value]
                    };

                    const auction = await Api.auctions.create(data);
                    
                    Utils.toast('Subasta creada y publicada', 'success');
                    
                    setTimeout(() => {
                        window.location.href = `/auctions/${auction.id}`;
                    }, 1000);

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
