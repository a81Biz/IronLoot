/**
 * SellerFlow
 * @role Orchestrator (Business Logic)
 * @description Handles seller onboarding/activation.
 * @depends SellerService, UserService, AuthState, Utils
 */
window.SellerFlow = (function() {

    /**
     * Activate Seller
     * @param {Object} params
     * @param {Object} params.profileData - { legalName, ... } (optional)
     * @param {boolean} params.acceptTerms
     * @returns {Promise<boolean>} success
     */
    async function activateSeller({ profileData, acceptTerms }) {
        try {
            // 1. Update Profile (if data provided)
            if (profileData) {
                // We ignore the token from this intermediate step to avoid double refresh,
                // or we could use it. But step 2 is the big one.
                await UserService.updateMe(profileData);
            }

            // 2. Enable Seller
            // Expected: { data, accessToken? }
            const res = await SellerService.enableSeller({ acceptTerms });

            // 3. Consistency (Critical Step)
            if (res.accessToken) {
                AuthState.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
            } else {
                // Force DO-NEW + WAIT
                await AuthState.refreshUser();
            }

            // 4. Verify (Optional Safety check)
            if (!AuthState.isSeller()) {
                console.warn('[SellerFlow] Activated but Token claims !isSeller. Backend lag?');
            }

            return true;

        } catch (error) {
            console.error('[SellerFlow] Activation failed', error);
            throw error;
        }
    }

    async function loadSellerDashboard() {
        return SellerService.getDashboard();
    }

    async function updateSellerProfile(data) {
        return SellerService.updateProfile(data);
    }

    return {
        activateSeller,
        loadSellerDashboard,
        updateSellerProfile
    };
})();
