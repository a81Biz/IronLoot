/**
 * Iron Loot - Auth State Management
 * Strict Token-Based Identity.
 * Source of Truth: The JWT Token.
 */

const AuthState = (function() {
    // --- Constants & Enums ---
    const EVENTS = {
        USER_UPDATED: 'auth:user-updated',
        USER_CLEARED: 'auth:user-cleared'
    };

    const IDENTITY_CLAIMS = ['sub', 'email', 'emailVerified', 'displayName', 'isSeller'];

    // --- State ---
    let currentUser = null; // { data: { ...claims } }
    let isInitialized = false;
    let refreshPromise = null; // For single-flight refresh

    // --- Private Helpers ---
    // Token decoding removed (Server-Side Auth)


    /**
     * Internal state updater
     * Emits event ONLY if effective change or forced.
     */
    function _updateState(payload) {
        // Wrap to match assumed structure in app { data: payload }
        const newUser = { data: payload };
        
        // Simple equality check optimization could go here, 
        // but for now we emit to be safe as per "One Truth" rule.
        currentUser = newUser;
        window.dispatchEvent(new CustomEvent(EVENTS.USER_UPDATED, { detail: currentUser }));
    }

    function _clearState() {
        if (currentUser === null) return; // Already cleared
        currentUser = null;
        window.dispatchEvent(new CustomEvent(EVENTS.USER_CLEARED));
    }

    // --- Public API Implementation ---

    /**
     * Initialize: Hydrate from storage
     */
    async function init() {
        if (isInitialized) return;

        // Listen for 401s from ApiClient
        window.addEventListener('auth:cleared', () => {
            _clearState();
        });

        hydrateFromSSR();
        isInitialized = true;
    }

    /**
     * Read state from SSR Injection
     */
    function hydrateFromSSR() {
        const payload = window.CURRENT_USER;
        if (payload) {
             _updateState(payload);
        } else {
             _clearState();
        }
    }

    /**
     * Set User (from Login/Register response)
     * @param {Object} user
     */
    function setUser(user) {
        if (!user) return;
        _updateState(user);
    }

    /**
     * Refresh User (Single Flight)
     * Fetches new token from backend using refreshToken.
     */
    /**
     * Refresh User - Now handled by HttpOnly Cookie auto-renewal or re-login.
     * We can verify session with an endpoint if needed, but for now we trust SSR/Cookie.
     */
     async function refreshUser() {
        // No-op for client-side token refresh. 
        // If session is invalid, next request fails and backend redirects or clears cookie.
        return null;
    }


    // --- Helpers (Data Access) ---

    function getUser() {
        return currentUser;
    }

    function isSeller() {
        return currentUser?.data?.isSeller === true;
    }

    function getDisplayName() {
        return currentUser?.data?.displayName || currentUser?.data?.username || '';
    }

    function isLoggedIn() {
        return !!currentUser;
    }

    /**
     * Guard Route
     */
    function guard() {
        if (!isLoggedIn()) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?return=${returnUrl}`;
            return false;
        }
        return true;
    }


    // Public API
    return {
        init,
        // Methods
        hydrateFromDOM: hydrateFromSSR,
        setUser,
        clearTokens: _clearState, // Alias compatibility
        refreshUser,
        getUser,
        guard,
        // Helpers
        isSeller,
        getDisplayName,
        isLoggedIn,
        // Constants
        EVENTS
    };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    AuthState.init();
});
