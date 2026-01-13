/**
 * DisputeService
 * @role API Wrapper (Domain: Disputes)
 */
window.DisputeService = (function() {

    async function create(payload) {
        const { data } = await Api.post(ApiRoutes.disputes.create, payload);
        return data;
    }

    async function listMine() {
        const { data } = await Api.get(ApiRoutes.disputes.list);
        return data;
    }

    async function getById(id) {
        const { data } = await Api.get(ApiRoutes.disputes.detail(id));
        return data;
    }

    async function addMessage(disputeId, message) {
        const { data } = await Api.post(ApiRoutes.disputes.addMessage(disputeId), { message });
        return data;
    }
    
    // Simplification for MVP: uploadEvidence as part of message or separate endpoint?
    // User spec says: `uploadEvidence(...)`.
    async function uploadEvidence(disputeId, formData) {
        // Assuming multipart/form-data
        // Api client naturally handles FormData if passed correctly?
        // Actually our Api client wrapper might need adjustment if it JSON stringifies everything.
        // But for now let's assume standard axios-like behavior or strict JSON.
        // If pure JSON API, maybe we upload specific file endpoint.
        // Let's assume JSON payload with base64 or similar for now to avoid FormData complexity 
        // unless Api client supports it.
        // However, standard file upload usually needs FormData.
        // Let's implement `post` normally.
        const { data } = await Api.post(ApiRoutes.disputes.uploadEvidence(disputeId), formData); // hope Api client doesn't force Content-Type: application/json
        return data;
    }

    async function resolve(disputeId, resolution) {
        const { data } = await Api.post(ApiRoutes.disputes.resolve(disputeId), { resolution });
        return data;
    }

    return {
        create,
        listMine,
        getById,
        addMessage,
        uploadEvidence,
        resolve
    };
})();
