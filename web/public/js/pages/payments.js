/**
 * Iron Loot - Payments History
 * Fetches data from /api/web-views/payments (Derived View)
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadPayments();
    });

    async function loadPayments() {
        const tbody = Utils.$('#paymentsTable');
        if (!tbody) return;

        try {
            // WebViewsController: GET /api/web-views/payments
            // WebViewsController: GET /api/web-views/payments
            const { data } = await Api.get(ApiRoutes.webViews.payments);
            const transactions = data.transactions || [];
            
            if (transactions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-secondary">No hay pagos registrados.</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = transactions.map(tx => `
                <tr>
                    <td class="font-mono text-sm">${tx.id.substring(0, 8)}</td>
                    <td>${formatTxType(tx.type)}</td>
                    <td class="${tx.amount < 0 ? 'text-error' : 'text-success'} font-bold">
                        ${Utils.formatCurrency(tx.amount)}
                    </td>
                    <td>${Utils.formatRelativeTime(tx.createdAt)}</td>
                    <td>
                        <span class="badge bg-success text-white">Completado</span>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load payments:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-error">Error al cargar el historial de pagos</td>
                </tr>
            `;
        }
    }

    function formatTxType(type) {
        const types = {
            'DEBIT_ORDER': 'Pago de Orden',
            'CREDIT_SALE': 'Venta Realizada',
            'FEE_PLATFORM': 'Comisión Plataforma'
        };
        return types[type] || type;
    }

})();
