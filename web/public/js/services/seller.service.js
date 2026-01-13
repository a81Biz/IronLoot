/**
 * SellerService
 * @role API Wrapper (Domain: Seller)
 * @description Encapsulates API calls related to seller onboarding and management.
 */
window.SellerService = (function() {

    /**
     * Enable Seller Account
     * @param {Object} data - { acceptTerms: boolean, ... }
     * @returns {Promise<{ data: Object, accessToken?: string }>}
     */
    async function enableSeller(data = { acceptTerms: true }) {
        return Api.post(ApiRoutes.users.enableSeller, data);
    }

    async function getDashboard() {
        // Stub: /seller/dashboard or aggregate
        return Api.get(ApiRoutes.seller.dashboard).then(res => res.data).catch(() => ({}));
    }

    async function updateProfile(data) {
        return Api.patch(ApiRoutes.seller.profile, data);
    }

    return {
        enableSeller,
        getDashboard,
        updateProfile
    };
})();
