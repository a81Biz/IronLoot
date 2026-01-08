/**
 * Iron Loot - Dispute Detail
 */

(function() {
    let currentDispute = null;

    document.addEventListener('DOMContentLoaded', () => {
        loadDispute();
    });

    async function loadDispute() {
        // Get ID from URL
        const pathParts = window.location.pathname.split('/');
        const disputeId = pathParts[pathParts.length - 1];

        try {
            currentDispute = await Api.disputes.getById(disputeId);
            renderDispute();
        } catch (error) {
            console.error('Failed to load dispute:', error);
            Utils.toast('Error al cargar la disputa', 'error');
        }
    }

    function renderDispute() {
        if (!currentDispute) return;

        Utils.$('#disputeId').textContent = currentDispute.id.substring(0, 8);
        Utils.$('#disputeDate').textContent = Utils.formatRelativeTime(currentDispute.createdAt);
        Utils.$('#disputeReason').textContent = currentDispute.reason;
        Utils.$('#disputeDescription').textContent = currentDispute.description;
        
        const orderId = currentDispute.orderId;
        const link = Utils.$('#orderLink');
        link.textContent = orderId;
        link.href = `/orders/${orderId}`;

        renderStatus(currentDispute.status);
        
        if (currentDispute.resolution) {
            Utils.show('#resolutionSection');
            Utils.$('#resolutionNotes').textContent = currentDispute.resolution;
        }
    }
    
    function renderStatus(status) {
        const el = Utils.$('#disputeStatus');
        let color = 'bg-secondary';
        let text = status;
        
        switch (status) {
            case 'OPEN': color = 'bg-warning text-dark'; text = 'Abierta'; break;
            case 'RESOLVED': color = 'bg-success text-white'; text = 'Resuelta'; break;
            case 'REJECTED': color = 'bg-error text-white'; text = 'Rechazada'; break;
        }
        
        el.className = `badge ${color}`;
        el.textContent = text;
    }

})();
