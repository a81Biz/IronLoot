/**
 * Iron Loot - Wallet Deposit
 */

(function() {
    let mp = null;
    let brickController = null;

    document.addEventListener('DOMContentLoaded', () => {
        // Initialize Mercado Pago SDK
        try {
            // TODO: Replace with your actual Public Key from .env or config
            mp = new MercadoPago("YOUR_PUBLIC_KEY", {
                locale: "es-MX"
            });
        } catch (e) {
            console.error("MercadoPago SDK not loaded", e);
        }

        setupDepositForm();
        setupProviderToggle();
        
        // Populate return URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return');
        if (returnUrl) {
            Utils.toast('Por favor deposita fondos para continuar', 'info');
        }
    });

    function setupProviderToggle() {
        const radios = document.querySelectorAll('input[name="provider"]');
        const brickContainer = document.getElementById('cardPaymentBrick_container');
        const offlineContainer = document.getElementById('offline_payment_options');
        const defaultBtn = document.getElementById('btnDeposit');
        
        function updateVisibility() {
            const selected = document.querySelector('input[name="provider"]:checked').value;
            
            // Hide everything first
            brickContainer.style.display = 'none';
            offlineContainer.style.display = 'none';
            defaultBtn.style.display = 'none';

            if (selected === 'MERCADO_PAGO') {
                brickContainer.style.display = 'block';
                // Initialize brick if needed
                const amount = parseFloat(document.getElementById('depositAmount').value) || 10;
                initializeBrick(amount);
            } 
            else if (selected === 'MERCADO_PAGO_OFFLINE') {
                offlineContainer.style.display = 'block';
                defaultBtn.style.display = 'block';
                defaultBtn.innerHTML = '<span class="material-symbols-outlined">receipt_long</span> Generar Recibo';
            }
            else {
                // PayPal or others (Standard Redirect)
                defaultBtn.style.display = 'block';
                defaultBtn.innerHTML = '<span class="material-symbols-outlined">payments</span> Procesar Depósito';
            }
        }

        radios.forEach(r => r.addEventListener('change', updateVisibility));
        
        // Initial check
        updateVisibility();
    }

    async function initializeBrick(amount) {
        if (!mp) return;
        if (brickController) return; 

        const settings = {
            initialization: {
                amount: amount,
                payer: {
                    email: 'test_user_123@test.com', // Will be overridden by backend
                },
            },
            customization: {
                paymentMethods: {
                    maxInstallments: 1,
                    paymentMethods: {
                        excludedPaymentMethods: [
                            { id: 'master' } 
                        ]
                    }
                },
                visual: {
                    style: {
                        theme: 'default',
                    }
                }
            },
            callbacks: {
                onReady: () => {
                    console.log('Brick ready');
                },
                onSubmit: ({ selectedPaymentMethod, formData }) => {
                    return new Promise((resolve, reject) => {
                        const currentAmount = parseFloat(document.getElementById('depositAmount').value);
                        
                        if (!currentAmount || currentAmount < 10) {
                            Utils.toast('Monto inválido (min $10)', 'error');
                            reject();
                            return;
                        }

                        // Send to backend
                        WalletService.processPayment({
                            ...formData,
                            amount: currentAmount,
                            provider: 'MERCADO_PAGO'
                        })
                        .then((response) => {
                            Utils.toast('Depósito exitoso!', 'success');
                            setTimeout(() => {
                                window.location.href = '/wallet';
                            }, 1500);
                            resolve();
                        })
                        .catch((error) => {
                            console.error('Payment error', error);
                            Utils.toast(error.message || 'Error al procesar el pago', 'error');
                            reject();
                        });
                    });
                },
                onError: (error) => {
                    console.error('Brick error', error);
                    Utils.toast('Ocurrió un error en el módulo de pagos', 'error');
                },
            },
        };

        const bricksBuilder = mp.bricks();
        try {
            brickController = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings);
        } catch (e) {
            console.error('Error creating brick', e);
        }
    }

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
                const providerInput = form.querySelector('input[name="provider"]:checked');
                const provider = providerInput ? providerInput.value : 'MERCADO_PAGO';

                if (!amount || amount < 10) {
                    Utils.toast('El monto mínimo es $10.00', 'error');
                    return;
                }

                if (provider === 'MERCADO_PAGO') {
                    // Handled by Brick (Double safety)
                    return; 
                }

                btn.disabled = true;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Procesando...';

                try {
                    if (provider === 'MERCADO_PAGO_OFFLINE') {
                        // Handle Offline Payment (Ticket)
                        const methodId = document.getElementById('offlineMethodSelector').value;
                        const response = await WalletService.processPayment({
                            amount: amount,
                            provider: 'MERCADO_PAGO',
                            payment_method_id: methodId,
                            payer: {
                                email: 'placeholder@user.com' // Backend overrides
                            }
                        });

                        // Check for external resource URL (Ticket)
                        if (response.data && response.data.point_of_interaction && response.data.point_of_interaction.transaction_data.ticket_url) {
                            const ticketUrl = response.data.point_of_interaction.transaction_data.ticket_url;
                            Utils.toast('Recibo generado exitosamente', 'success');
                            // Open ticket in new tab or redirect
                            window.open(ticketUrl, '_blank');
                            // Redirect user to wallet or history
                            setTimeout(() => {
                                window.location.href = '/wallet/history';
                            }, 2000);
                        } else {
                            throw new Error('No se pudo generar el recibo');
                        }

                    } else {
                        // Standard Redirect (PayPal)
                        const response = await WalletService.initiateDeposit(amount, provider);
                        
                        if (response.data && response.data.redirectUrl) {
                            Utils.toast('Redirigiendo...', 'success');
                            setTimeout(() => {
                                window.location.href = response.data.redirectUrl;
                            }, 1000);
                        } else {
                            throw new Error('No se recibió URL de redirección');
                        }
                    }

                } catch (error) {
                    console.error('Deposit initiation failed:', error);
                    Utils.toast(error.message || 'Error al iniciar el trámite', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }
    }
})();
