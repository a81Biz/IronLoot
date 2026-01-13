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
    let initPromiseResolver = null;
    const initPromise = new Promise(resolve => initPromiseResolver = resolve);
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

        await hydrateFromStorage();
        isInitialized = true;
        if (initPromiseResolver) initPromiseResolver(true);
    }

    /**
     * Hydrate from SSR or Storage
     * Tries to recover session from LocalStorage tokens if SSR failed.
     */
    async function hydrateFromStorage() {
        // 1. Check if we already have SSR user
        if (currentUser) return true;

        // 2. Check for Token in ApiClient (LocalStorage)
        // We can't access ApiClient directly if circular dependency, but usually fine in global scope.
        // Assuming Api exposes internal token check or we check storage manually?
        // Better: Try to fetch /me using ApiClient (which auto-uses token)
        
        // Quick check if token exists to avoid unnecessary 401
        // (We need to expose a check from ApiClient or assume)
        // But for now, let's try to fetch user if not present.

        // OPTIMIZATION: If SSR explicitly set CURRENT_USER to null, we are Guest.
        // Don't waste a network call just to get a 401.
        if (window.CURRENT_USER === null) {
            return false;
        }
        
        try {
             // If ApiClient has no token, this will fail or be skipped?
             // We need a way to check if we *should* try.
             // Let's rely on ApiClient.
             const { data } = await Api.get(ApiRoutes.auth.me);
             if (data) {
                 setUser(data);
                 return true;
             }
        } catch (e) {
            // Token invalid or no token
            _clearState();
        }
        return false;
    }

    /**
     * Read state from SSR Injection
     */
    function hydrateFromSSR() {
        const payload = window.CURRENT_USER;
        if (payload) {
             _updateState(payload);
        }
        // Do NOT clear state here if SSR is missing, as we might hydrate from storage next.
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
        try {
            const { data } = await Api.get(ApiRoutes.auth.me);
            if (data) {
                setUser(data);
                return data;
            }
        } catch (e) {
            console.warn('[AuthState] Refresh failed', e);
        }
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
        waitForInit: () => initPromise,
        // Methods
        hydrateFromStorage,
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
