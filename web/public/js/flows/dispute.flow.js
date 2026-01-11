/**
 * DisputeFlow
 * @role Orchestrator (Disputes)
 * @depends DisputeService, WalletFlow
 */
window.DisputeFlow = (function() {

    /**
     * Create Dispute
     */
    async function create({ orderId, reason, message, evidence }) {
        const payload = { orderId, reason, message };
        // If evidence exists, upload it or attach it?
        // Service has uploadEvidence separate usually.
        // Let's assume create returns ID, then we upload evidence.
        
        const dispute = await DisputeService.create(payload);
        
        if (evidence) {
            await DisputeService.uploadEvidence(dispute.id, evidence);
        }
        
        // Redirect to detail
        window.location.href = `/disputes/${dispute.id}`;
        return dispute;
    }

    /**
     * Load List
     */
    async function loadList() {
        return DisputeService.listMine();
    }

    /**
     * Load Detail
     */
    async function loadDetail({ disputeId }) {
        return DisputeService.getById(disputeId);
    }

    /**
     * Add Message (or Evidence)
     */
    async function addMessageOrEvidence({ disputeId, message, files }) {
        if (message) {
            await DisputeService.addMessage(disputeId, message);
        }
        if (files) {
            await DisputeService.uploadEvidence(disputeId, files);
        }
        
        // Return updated detail? Or let caller reload?
        // Flow usually returns data or void.
        return true;
    }

    /**
     * Resolve Dispute (Admin/Seller)
     */
    async function resolve({ disputeId, resolution }) {
        const res = await DisputeService.resolve(disputeId, resolution);
        
        // Resolution might affect wallet
        if (window.WalletFlow) {
            await WalletFlow.syncAfterMutation();
        }
        return res;
    }

    return {
        create,
        loadList,
        loadDetail,
        addMessageOrEvidence,
        resolve
    };
})();
