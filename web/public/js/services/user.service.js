/**
 * UserService
 * @role API Wrapper (Domain: Users)
 * @description Encapsulates API calls related to user profile and settings.
 */
window.UserService = (function() {
    
    /**
     * Get My Profile (Rich Data)
     * NOTE: This data is for display only (bio, stats).
     * NOT authoritative for identity/roles.
     */
    async function getMe() {
        // Returns { data: ... }
        return Api.get(ApiRoutes.users.me); 
    }

    /**
     * Update My Profile
     * @param {Object} data - { displayName, ... }
     * @returns {Promise<{ data: Object, accessToken?: string }>} response
     */
    async function updateMe(data) {
        // Expected response: { data: updatedUser, accessToken: newToken? }
        return Api.patch(ApiRoutes.users.me, data);
    }

    /**
     * Get User Statistics
     */
    async function getStats() {
        const { data } = await Api.get(ApiRoutes.users.stats);
        return data; 
    }

    /**
     * Get User Settings
     */
    async function getSettings() {
        const { data } = await Api.get(ApiRoutes.users.settings);
        return data;
    }

    /**
     * Update User Settings
     */
    async function updateSettings(settings) {
        const { data } = await Api.patch(ApiRoutes.users.settings, settings);
        return data;
    }

    return {
        getMe,
        updateMe,
        getStats,
        getSettings,
        updateSettings
    };
})();
