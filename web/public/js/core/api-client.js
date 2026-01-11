/**
 * Iron Loot - API Client
 * Wraps HTTP requests and handles token injection/storage.
 * Does NOT contain domain logic.
 */

const ApiClient = (function() {
  // Configuration
  const BASE_URL = window.APP_CONFIG?.apiUrl || '/api/v1';
  const TIMEOUT = 30000;

  // State - Managed by HttpOnly Cookie (Server) and AuthState (SSR)
  // No local token storage.

  /**
   * Set authentication tokens - Deprecated/No-op
   */
  function setTokens() {
    // No-op
  }

  /**
   * Clear all tokens - Deprecated/No-op
   */
  function clearTokens() {
    // No-op
  }

  /**
   * Get current Access Token
   */
  function getAccessToken() {
    return null;
  }

  /**
   * Helper: Build full URL
   */
  function _buildUrl(path, params = {}) {
    // Determine Base URL (handling leading/trailing slashes)
    let base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    let endpoint = path.startsWith('/') ? path : '/' + path;
    const url = new URL(base + endpoint, window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  }

  /**
   * Helper: Get Headers
   */
  function _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const csrfToken = Utils.getCookie('XSRF-TOKEN');
    if (csrfToken) {
       headers['x-xsrf-token'] = csrfToken;
    }
    return headers;
  }

  /**
   * Core request method
   */
  async function request(method, path, body = null, options = {}) {
    const url = _buildUrl(path, options.params);
    const headers = _getHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
      credentials: 'include',
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const traceId = response.headers.get('x-trace-id');

      // --- CRITICAL: 401 Handling (No Loops) ---
      if (response.status === 401) {
        console.warn('[Api] 401 Unauthorized. Clearing tokens.');
        clearTokens();
        // Emit event so AuthState can react (clean state)
        window.dispatchEvent(new CustomEvent('auth:cleared')); 
        // Throw error to stop flow
        const err = new Error('Unauthorized');
        err.statusCode = 401;
        throw err;
      }

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(data?.message || 'Request failed');
        error.statusCode = response.status;
        error.data = data;
        error.traceId = traceId;
        throw error;
      }

      // Return unified response
      return { data, status: response.status, accessToken: data?.accessToken };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
         throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // --- Cookie Helpers ---
  // --- Cookie Helpers Removed ---

  // Public Interface
  return {
    setTokens,
    clearTokens,
    getAccessToken,
    isAuthenticated: () => false, // Handled by AuthState
    
    get: (path, options) => request('GET', path, null, options),
    post: (path, body, options) => request('POST', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    delete: (path, options) => request('DELETE', path, null, options)
  };
})();

window.Api = ApiClient;
