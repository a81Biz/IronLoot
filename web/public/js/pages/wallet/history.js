/**
 * Iron Loot - Wallet History
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadHistory();
    });

    async function loadHistory() {
        const tbody = Utils.$('#historyTable');
        if (!tbody) return;

        try {
            const history = await Api.wallet.getHistory(50); // Get last 50
            
            if (!history || history.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-secondary">No hay transacciones registradas</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = history.map(tx => `
                <tr>
                    <td>${Utils.formatRelativeTime(tx.createdAt)}<br><small class="text-secondary">${new Date(tx.createdAt).toLocaleString()}</small></td>
                    <td>${formatTransactionType(tx.type)}</td>
                    <td class="${getAmountClass(tx.type)}">${Utils.formatCurrency(tx.amount)}</td>
                    <td>${formatStatus(tx.status)}</td>
                    <td><span class="text-xs font-mono">${Utils.escapeHtml(tx.referenceId || '-')}</span></td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load history:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-error">Error al cargar el historial</td>
                </tr>
            `;
        }
    }

    function formatTransactionType(type) {
        const types = {
            'DEPOSIT': 'Depósito',
            'WITHDRAWAL': 'Retiro',
            'BID_HOLD': 'Retención (Puja)',
            'BID_RELEASE': 'Devolución (Puja)',
            'PAYMENT': 'Pago',
            'REFUND': 'Reembolso'
        };
        // Add icon
        return types[type] || type;
    }

    function getAmountClass(type) {
        if (['DEPOSIT', 'BID_RELEASE', 'REFUND'].includes(type)) return 'text-success fw-bold';
        if (['WITHDRAWAL', 'PAYMENT', 'BID_HOLD'].includes(type)) return 'text-error fw-bold';
        return '';
    }
    
    function formatStatus(status) {
        const badgeClass = {
            'COMPLETED': 'bg-success',
            'PENDING': 'bg-warning text-dark',
            'FAILED': 'bg-error',
            'CANCELLED': 'bg-secondary'
        }[status] || 'bg-secondary';
        
        const label = {
            'COMPLETED': 'Completado',
            'PENDING': 'Pendiente',
            'FAILED': 'Fallido',
            'CANCELLED': 'Cancelado'
        }[status] || status;
        
        return `<span class="badge ${badgeClass}">${label}</span>`;
    }

})();
