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
     * Parse JWT payload
     */
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Failed to parse JWT', e);
            return null;
        }
    }

    /**
     * Fetch current user data from Token
     */
    async function hydrate() {
        try {
            const token = Api.getAccessToken();
            if (!token) {
                currentUser = null;
                return null;
            }
            
            const payload = parseJwt(token);
            if (!payload) {
                throw new Error('Invalid token format');
            }
            
            // Map JWT payload to currentUser structure expected by UI
            // Payload now matches UserResponseDto structure
            currentUser = { data: payload }; // Wrapper to match previous API response structure { data: ... }
            
            // Notify system
            window.dispatchEvent(new CustomEvent(EVENT_USER_UPDATED, { detail: currentUser }));
            return currentUser;
        } catch (error) {
            console.error('Hydration error', error);
            currentUser = null;
            throw error;
        }
    }

    /**
     * Force refresh user data (e.g. after profile update)
     */
    async function refreshUser() {
        try {
             const rt = localStorage.getItem('ironloot_refresh_token');
             if (!rt) throw new Error('No refresh token');
             
             // Force network refresh
             const res = await Api.post('/auth/refresh', { refreshToken: rt });
             if (res && res.accessToken) {
                 Api.setTokens(res.accessToken, res.refreshToken);
                 return await hydrate();
             }
        } catch (e) {
            console.error('Failed to refresh user', e);
            throw e;
        }
    }

    /**
     * Refresh session (explicit call if needed)
     */
    async function refresh() {
       return refreshUser();
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
        if (!currentUser || !currentUser.data) return false;
        // Mapping for backward compatibility or direct check
        if (role === 'SELLER') return currentUser.data.isSeller;
        return false;
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

    function updateUser(user) {
        currentUser = user;
        updateUI();
    }

    // Public API
    return {
        init,
        hydrate,
        updateUser, // Expose method
        refreshUser, // Expose method (new)
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
