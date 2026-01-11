/**
 * AuthFlow
 * @role Orchestrator (Authentication & Session)
 * @description Handles Login, Register, Logout, and Session Hydration.
 * @depends AuthService, AuthState, Utils
 */
window.AuthFlow = (function() {

    // --- Section 0: Session Hydration ---

    /**
     * Hydrate Session
     * Restores session from storage on app load.
     */
    async function hydrateSession() {
        // AuthState.hydrateFromStorage internally validates expiration.
        const success = await AuthState.hydrateFromStorage();
        if (!success) {
            // Token invalid or missing.
            // If on protected route, redirect is handled by Guards or Page init logic usually.
            // But we can enable a force redirect here if needed.
            // For now, just ensure state is cleared.
            // AuthState.hydrateFromStorage calls _clearState() on failure.
        }
        return success;
    }

    /**
     * Refresh Session
     * Wrapper for AuthState logic or explicit API check.
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
            
            // 2. Strict Requirement: NO Auto-Login.
            // Persist email for next view
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
     */
    async function login({ email, password }) {
        try {
            // 1. Service Call
            const res = await AuthService.login(email, password);
             // Expected: { accessToken, refreshToken, ... } or { tokens: {...} }
             const tokens = res.tokens || res;

            // 2. Set Tokens (Identity Source)
            if (tokens && tokens.accessToken) {
                AuthState.setTokens(tokens);
                
                // 3. Redirect
                const returnParam = new URLSearchParams(window.location.search).get('return');
                let returnUrl = '/dashboard';
                // Prevent Open Redirect: only allow relative paths
                if (returnParam && returnParam.startsWith('/') && !returnParam.startsWith('//')) {
                    returnUrl = returnParam;
                }
                window.location.href = returnUrl;
                return res;
            } else {
                throw new Error('No tokens received');
            }
        } catch (error) {
            console.error('[AuthFlow] Login failed', error);
            throw error;
        }
    }

    /**
     * Logout
     */
    async function logout() {
        try {
            // 1. Service Call (Optional, good for invalidating refresh token)
            await AuthService.logout(); 
        } catch (e) {
            console.warn('Logout API call failed', e);
        } finally {
            // 2. Clear State
            AuthState.clearTokens();
            // 3. Redirect
            window.location.href = '/login';
        }
    }

    /**
     * Verify Email
     * @param {string} token - Verification token
     */
    async function verifyEmail({ token }) {
        try {
            // 1. Service
            // Expected: might return new tokens with emailVerified=true
            const res = await AuthService.verifyEmail(token);
            
            // 2. Refresh / Set Tokens
            if (res.accessToken) {
                AuthState.setTokens(res);
            } else {
                // DO-NEW + WAIT
                await AuthState.refreshUser();
            }

            // 3. Redirect
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
