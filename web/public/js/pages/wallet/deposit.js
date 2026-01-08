/**
 * Iron Loot - Wallet Deposit
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        setupDepositForm();
        
        // Populate return URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return');
        if (returnUrl) {
            // Optional: Show message "Complete deposit to return to..."
            Utils.toast('Por favor deposita fondos para continuar', 'info');
        }
    });

    function setupDepositForm() {
        const form = Utils.$('#depositForm');
        const input = Utils.$('#depositAmount');
        const btn = Utils.$('#btnDeposit');

        // Suggestions
        Utils.$$('.deposit-suggestion').forEach(sug => {
            sug.addEventListener('click', () => {
                input.value = sug.dataset.amount;
            });
        });

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amount = parseFloat(input.value);
                
                if (!amount || amount < 10) {
                    Utils.toast('El monto mínimo es $10.00', 'error');
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Procesando...';

                try {
                    // Call API
                    // Note: API might require referenceId or it might be auto-generated.
                    // The API client wrapper takes (amount, referenceId).
                    // If backend handles it, we pass generic reference or null.
                    // Checking stripe.provider.ts or similar implies it might create a session.
                    // But here we are using `Api.wallet.deposit(amount)`.
                    const result = await Api.wallet.deposit(amount, `DEP-${Date.now()}`);
                    
                    Utils.toast('Depósito exitoso', 'success');
                    
                    // Handle redirect
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('return');
                    
                    setTimeout(() => {
                        if (returnUrl) {
                            window.location.href = decodeURIComponent(returnUrl);
                        } else {
                            window.location.href = '/wallet';
                        }
                    }, 1000);

                } catch (error) {
                    console.error('Deposit failed:', error);
                    Utils.toast(error.message || 'Error al procesar el depósito', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">payments</span> Procesar Depósito';
                }
            });
        }
    }
})();
