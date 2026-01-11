/**
 * ProfileFlow
 * @role Orchestrator (Business Logic)
 * @description Handles user profile updates and consistency.
 * @depends UserService, AuthState
 */
window.ProfileFlow = (function() {

    /**
     * Update Display Name
     * @param {Object} params - { displayName }
     * @returns {Promise<boolean>} success
     */
    async function updateDisplayName({ displayName }) {
        let success = false;
        try {
            // 1. Call Service
            // Expected: { data, accessToken? }
            const res = await UserService.updateMe({ displayName });

            // 2. Handle Token Update (Optimization)
            if (res.accessToken) {
                // If backend returned new token, use it directly (faster)
                // Assuming it might also return refreshToken, or we keep old one.
                // AuthState.setTokens signatures: { accessToken, refreshToken? }
                AuthState.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
            } else {
                // 3. Fallback: Force Refresh (WAIT is MANDATORY)
                // If no token in response, we MUST fetch it to see the new displayName claim.
                await AuthState.refreshUser();
            }

            success = true;
        } catch (error) {
            console.error('[ProfileFlow] Update failed', error);
            throw error;
        }
        
        return success;
    }

    async function loadProfile() {
        // Return rich profile data
        const { data } = await UserService.getMe();
        return data;
    }

    async function loadStats() {
        return UserService.getStats();
    }

    async function updateSettings(settings) {
        return UserService.updateSettings(settings);
    }

    return {
        updateDisplayName,
        loadProfile,
        loadStats,
        updateSettings
    };
})();
