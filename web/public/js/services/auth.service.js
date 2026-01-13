/**
 * AuthService
 * @role API Wrapper (Domain: Auth)
 * @description Encapsulates Authentication API calls.
 */
window.AuthService = (function() {

    async function login(email, password) {
        return Api.post(ApiRoutes.auth.login, { email, password });
    }

    async function register(userData) {
        return Api.post(ApiRoutes.auth.register, userData);
    }

    async function logout() {
        return Api.post(ApiRoutes.auth.logout);
    }

    async function verifyEmail(token) {
        return Api.post(ApiRoutes.auth.verifyEmail, { token });
    }

    async function forgotPassword(email) {
        return Api.post(ApiRoutes.auth.forgotPassword, { email });
    }

    async function resetPassword(token, newPassword) {
        return Api.post(ApiRoutes.auth.resetPassword, { token, newPassword });
    }
    
    /**
     * Explicit Refresh
     * @param {string} [refreshToken] - Optional, if not provided, Proxy will inject from Cookie
     */
    async function refresh(refreshToken) {
        // If no token provided, send empty object (Proxy handles injection)
        return Api.post(ApiRoutes.auth.refresh, { refreshToken });
    }

    return {
        login,
        register,
        logout,
        verifyEmail,
        forgotPassword,
        resetPassword,
        refresh
    };
})();
