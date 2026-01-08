/**
 * Iron Loot - Create Dispute
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');
        
        if (!orderId) {
            Utils.toast('ID de orden no especificado', 'error');
            setTimeout(() => window.location.href = '/orders', 2000);
            return;
        }

        Utils.$('#orderId').value = orderId;
        Utils.$('#displayOrderId').textContent = orderId.substring(0, 8);
        
        setupForm();
    });

    function setupForm() {
        const form = Utils.$('#createDisputeForm');
        const btn = Utils.$('#btnCreate');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Enviando...';

                try {
                    const data = {
                        orderId: Utils.$('#orderId').value,
                        reason: Utils.$('#reason').value,
                        description: Utils.$('#description').value
                    };

                    const dispute = await Api.disputes.create(data);
                    
                    Utils.toast('Disputa creada correctamente', 'success');
                    
                    setTimeout(() => {
                        window.location.href = `/disputes/${dispute.id}`;
                    }, 1000);

                } catch (error) {
                    console.error('Create dispute failed:', error);
                    Utils.toast(error.message || 'Error al crear la disputa', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">gavel</span> Abrir Disputa';
                }
            });
        }
    }
})();
