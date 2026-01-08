/**
 * Iron Loot - Disputes List
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadDisputes();
    });

    async function loadDisputes() {
        const tbody = Utils.$('#disputesTable');
        if (!tbody) return;

        try {
            const disputes = await Api.disputes.list();
            
            if (!disputes || disputes.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-secondary">No tienes disputas registradas</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = disputes.map(dispute => `
                <tr>
                    <td class="font-mono text-sm">${dispute.id.substring(0, 8)}</td>
                    <td class="font-mono text-sm">${dispute.orderId?.substring(0, 8) || '-'}</td>
                    <td>${dispute.reason}</td>
                    <td>${formatStatus(dispute.status)}</td>
                    <td>${Utils.formatRelativeTime(dispute.createdAt)}</td>
                    <td>
                        <a href="/disputes/${dispute.id}" class="btn btn-secondary btn-sm">
                            Ver Detalle
                        </a>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Failed to load disputes:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-error">Error al cargar las disputas</td>
                </tr>
            `;
        }
    }

    function formatStatus(status) {
        let color = 'bg-secondary';
        let text = status;
        
        switch (status) {
            case 'OPEN': color = 'bg-warning text-dark'; text = 'Abierta'; break;
            case 'RESOLVED': color = 'bg-success text-white'; text = 'Resuelta'; break;
            case 'REJECTED': color = 'bg-error text-white'; text = 'Rechazada'; break;
        }
        
        return `<span class="badge ${color}">${text}</span>`;
    }
})();
