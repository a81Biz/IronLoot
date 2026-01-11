/**
 * AuthService
 * @role API Wrapper (Domain: Auth)
 * @description Encapsulates Authentication API calls.
 */
window.AuthService = (function() {

    function _getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-xsrf-token': Utils.getCookie('XSRF-TOKEN') || ''
        };
    }

    async function login(email, password) {
        // Api.post returns { data: { user, tokens }, ... }
        // We return the full response or just data?
        // Let's return the raw response structure the Flows expect or Api.post returns.
        const res = await fetch('/auth/session/login', {
            method: 'POST',
            headers: _getHeaders(),
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw await res.json();
        return await res.json(); 
    }

    async function register(userData) {
        const res = await fetch('/auth/session/register', {
            method: 'POST',
            headers: _getHeaders(),
            body: JSON.stringify(userData)
        });
        if (!res.ok) throw await res.json();
        return await res.json();
    }

    async function logout() {
        return fetch('/auth/session/logout', { 
            method: 'POST',
            headers: _getHeaders()
        });
    }

    async function verifyEmail(token) {
        return Api.post('/auth/verify-email', { token });
    }

    async function forgotPassword(email) {
        return Api.post('/auth/forgot-password', { email });
    }

    async function resetPassword(token, newPassword) {
        return Api.post('/auth/reset-password', { token, newPassword });
    }
    
    /**
     * Explicit Refresh
     * @param {string} refreshToken
     */
    async function refresh(refreshToken) {
        // Api.post returns { data, ... }
        // endpoint returns { accessToken, refreshToken }
        return Api.post('/auth/refresh', { refreshToken });
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
