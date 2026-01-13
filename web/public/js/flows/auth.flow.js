/**
 * AuthFlow
 * @role Orchestrator (Authentication & Session)
 * @description Handles Login, Register, Logout, and Session Hydration.
 * @depends AuthService, AuthState, Utils
 * 
 * NOTA: Los tokens ahora se manejan via cookies HttpOnly.
 * El proxy intercepta las respuestas de auth y setea las cookies automáticamente.
 * El body de respuesta solo contiene { success: true, user: {...} }
 */
window.AuthFlow = (function() {

    // --- Section 0: Session Hydration ---

    /**
     * Hydrate Session
     * Restores session from SSR injection or /auth/me endpoint.
     */
    async function hydrateSession() {
        const success = await AuthState.hydrateFromStorage();
        return success;
    }

    /**
     * Refresh Session
     */
    async function refreshSession() {
        return AuthState.refreshUser();
    }

    // --- Section A: Auth Actions ---

    /**
     * Register
     * @param {Object} payload - { email, password, username, ... }
     * @returns {Promise<Object>} result
     */
    async function register(payload) {
        try {
            // 1. Call Service
            const res = await AuthService.register(payload);
            
            // 2. NO Auto-Login - Redirect to verification
            sessionStorage.setItem('pendingVerifyEmail', payload.email);

            // 3. Redirect to Pending Verification
            window.location.href = '/auth/verify-email-pending';
            
            return res;

        } catch (error) {
            console.error('[AuthFlow] Register failed', error);
            throw error;
        }
    }

    /**
     * Login
     * @param {string} email 
     * @param {string} password 
     * 
     * Response format (from proxy):
     * { success: true, user: {...} }
     * Tokens are set as HttpOnly cookies by the proxy
     */
    async function login({ email, password }) {
        try {
            // 1. Service Call
            const res = await AuthService.login(email, password);
            console.log('[AuthFlow] Login Response:', res);
            
            // Expected: { data: { success: true, user: {...} } }
            const payload = res.data || {};
            const user = payload.user;

            // 2. Validate response
            if (!payload.success) {
                throw new Error(payload.message || 'Login failed');
            }

            // 3. Set User State (tokens are in HttpOnly cookies, handled by proxy)
            if (user) {
                console.log('[AuthFlow] Setting active user...');
                AuthState.setUser(user);
                console.log('[AuthFlow] User set. Preparing redirect.');
            } else {
                // Login successful but no user in response - fetch from /me
                console.log('[AuthFlow] No user in response, fetching from /me...');
                await AuthState.hydrateFromStorage();
            }
            
            // 4. Redirect
            const returnParam = new URLSearchParams(window.location.search).get('return');
            let returnUrl = '/dashboard';
            
            // Prevent Open Redirect
            if (returnParam && returnParam.startsWith('/') && !returnParam.startsWith('//') && !returnParam.includes(':')) {
                returnUrl = returnParam;
            }
            
            console.log('[AuthFlow] REDIRECTING TO:', returnUrl);
            window.location.href = returnUrl;
            return res;

        } catch (error) {
            console.error('[AuthFlow] Login failed', error);
            throw error;
        }
    }

    /**
     * Logout
     * Cookie is cleared by the proxy when calling /auth/logout
     */
    async function logout() {
        try {
            await AuthService.logout(); 
        } catch (e) {
            console.warn('Logout API call failed', e);
        } finally {
            // Clear Client State
            AuthState.clearTokens();
            // Redirect
            window.location.href = '/login';
        }
    }

    /**
     * Verify Email
     * @param {string} token - Verification token
     */
    async function verifyEmail({ token }) {
        try {
            const res = await AuthService.verifyEmail(token);
            
            const payload = res.data || {};
            const user = payload.user;

            if (user) {
                AuthState.setUser(user);
            } else {
                await AuthState.refreshUser();
            }

            window.location.href = '/profile';
            return true;
        } catch (error) {
            console.error('[AuthFlow] Verification failed', error);
            throw error;
        }
    }

    /**
     * Forgot Password
     * @param {string} email
     */
    async function forgotPassword(email) {
        return AuthService.forgotPassword(email);
    }

    /**
     * Reset Password
     * @param {string} token
     * @param {string} newPassword
     */
    async function resetPassword(token, newPassword) {
        return AuthService.resetPassword(token, newPassword);
    }

    return {
        hydrateSession,
        refreshSession,
        register,
        login,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword
    };
})();
