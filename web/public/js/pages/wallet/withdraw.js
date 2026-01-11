/**
 * Iron Loot - Wallet Withdraw
 */

(function() {
    let availableBalance = 0;

    document.addEventListener('DOMContentLoaded', () => {
        loadBalance();
        setupWithdrawForm();
    });

    async function loadBalance() {
        try {
            const balance = await WalletFlow.loadBalance();
            availableBalance = balance.available || 0;
            Utils.$('#withdrawAvailable').textContent = Utils.formatCurrency(availableBalance);
            
            const input = Utils.$('#withdrawAmount');
            if (input) input.max = availableBalance;

        } catch (e) {
            console.error('Failed to load balance', e);
        }
    }

    function setupWithdrawForm() {
        const form = Utils.$('#withdrawForm');
        const input = Utils.$('#withdrawAmount');
        const btn = Utils.$('#btnWithdraw');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amount = parseFloat(input.value);
                
                if (!amount || amount < 10) {
                    Utils.toast('El monto mínimo es $10.00', 'error');
                    return;
                }

                if (amount > availableBalance) {
                    Utils.toast('Fondos insuficientes', 'error');
                    return;
                }

                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Procesando...';

                try {
                    // Use WalletFlow
                    await WalletFlow.withdraw({
                        amount, 
                        destination: `WTH-${Date.now()}` // Mock destination/ref
                    });
                    
                    Utils.toast('Solicitud de retiro enviada', 'success');
                    
                    setTimeout(() => {
                         window.location.href = '/wallet/history';
                    }, 1000);

                } catch (error) {
                    console.error('Withdraw failed:', error);
                    Utils.toast(error.message || 'Error al procesar el retiro', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">payments</span> Solicitar Retiro';
                }
            });
        }
    }
})();
