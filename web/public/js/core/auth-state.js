/**
 * Iron Loot - Auth State Management
 * Handles session hydration, refresh, role management, and route guarding.
 */

const AuthState = (function() {
    // Current User State
    let currentUser = null;
    let isInitialized = false; // To track if we've attempted hydration

    // Events
    const EVENT_USER_UPDATED = 'auth:user-updated';

    /**
     * Initialize Auth State
     * Called on page load
     */
    async function init() {
        if (isInitialized) return;
        
        if (Api.isAuthenticated()) {
            try {
                await hydrate();
            } catch (error) {
                console.warn('Hydration failed, attempting refresh...', error);
                // Hydration failed (e.g. 401). API Client might have already tried refresh?
                // If API client handles 401 auto-refresh, we might just need to catch here.
                // But if we want explicit handling:
                // For now, if hydration fails, we assume token invalid/expired if not recovered.
                 if (!Api.isAuthenticated()) {
                     // Token was cleared by API client on 401
                     currentUser = null;
                 }
            }
        }
        isInitialized = true;
        updateUI();
    }

    /**
     * Fetch current user data from API
     */
    async function hydrate() {
        try {
            const user = await Api.get('/auth/me'); // Api client adds /api/v1 prefix? No, based on api-client.js it uses BASE_URL = /api/v1. So /auth/me -> /api/v1/auth/me
            currentUser = user;
            // Notify system
            window.dispatchEvent(new CustomEvent(EVENT_USER_UPDATED, { detail: user }));
            return user;
        } catch (error) {
            currentUser = null;
            throw error;
        }
    }

    /**
     * Refresh session (explicit call if needed)
     */
    async function refresh() {
       // Typically handled by ApiClient interceptor, but exposed if needed
       try {
           const response = await Api.post('/auth/refresh');
           // ApiClient should update tokens automatically if it intercepts. 
           // If direct call, we might need to set tokens?
           // Assuming ApiClient handles token storage on success if response has tokens.
           // If the endpoint just sets cookies (unlikely for mobile-ready), we check response.
           if (response.accessToken) {
               // ApiClient.setTokens(response.accessToken, response.refreshToken); // If exposed
               // Re-hydrate
               await hydrate();
           }
       } catch (e) {
           console.error('Refresh failed', e);
           logout();
       }
    }

    /**
     * Logout
     */
    async function logout() {
        try {
            await Api.post('/auth/logout');
        } catch (e) {
            console.warn('Logout API call failed', e);
        } finally {
            Api.clearTokens();
            currentUser = null;
            window.location.href = '/';
        }
    }

    /**
     * Check if user has specific role
     * @param {string} role 
     */
    function hasRole(role) {
        if (!currentUser || !currentUser.roles) return false;
        return currentUser.roles.includes(role);
    }

    /**
     * Get User
     */
    function getUser() {
        return currentUser;
    }

    /**
     * Guard Route
     * Call this on private pages
     */
    function guard() {
        if (!Api.isAuthenticated()) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?return=${returnUrl}`;
            return false;
        }
        return true;
    }

    /**
     * Update UI based on roles/state
     * (Basic stuff, Navigation component handles specific menu items)
     */
    function updateUI() {
        // Dispatch event for other components to react
         window.dispatchEvent(new CustomEvent(EVENT_USER_UPDATED, { detail: currentUser }));
    }

    // Public API
    return {
        init,
        hydrate,
        logout,
        hasRole,
        getUser,
        guard,
        EVENTS: {
            USER_UPDATED: EVENT_USER_UPDATED
        }
    };
})();

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    AuthState.init();
});
