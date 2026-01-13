/**
 * Iron Loot - API Client
 * Wraps HTTP requests and handles authentication via cookies.
 * 
 * NOTA: Tokens se manejan via cookies HttpOnly:
 * - El proxy setea cookies en login/register
 * - El proxy inyecta Authorization header automáticamente
 * - No hay tokens en localStorage (seguridad)
 */

const ApiClient = (function() {
  // Configuration
  const BASE_URL = window.APP_CONFIG?.apiUrl || '/api/v1';
  const TIMEOUT = 30000;

  /**
   * @deprecated Tokens are handled via HttpOnly cookies by the proxy
   */
  function setTokens(tokens) {
    // No-op: cookies are set by proxy
    console.warn('[ApiClient] setTokens() deprecated - tokens handled via HttpOnly cookies');
  }

  /**
   * @deprecated Tokens are handled via HttpOnly cookies by the proxy
   */
  function clearTokens() {
    // No-op: cookies are cleared by proxy on logout
  }

  /**
   * @deprecated Tokens are in HttpOnly cookies (not accessible from JS)
   */
  function getAccessToken() {
    return null;
  }

  /**
   * Helper: Build full URL
   */
  function _buildUrl(path, params = {}) {
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
    
    // CSRF Token (Double Submit Cookie pattern)
    const csrfToken = Utils.getCookie('XSRF-TOKEN');
    if (csrfToken) {
       headers['x-xsrf-token'] = csrfToken;
    }
    
    // Note: Authorization header is injected by the proxy from HttpOnly cookie
    // No need to add it here
    
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
      credentials: 'include', // Important: Send cookies with requests
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

       const traceId = response.headers.get('x-trace-id');

      // ===================================
      // 401 Interceptor (Auto-Refresh)
      // ===================================
      if (response.status === 401) {
        // Prevent infinite loops if refresh itself fails
        if (path.includes('/auth/refresh')) {
             console.warn('[Api] Refresh failed. Clearing session.');
             window.dispatchEvent(new CustomEvent('auth:cleared'));
             throw new Error('Session expired');
        }

        console.warn('[Api] 401 detected. Attempting Auto-Refresh...');

        try {
            // Attempt Refresh (Proxy will inject cookie)
            // We use a fresh Api.post call here
            await Api.post(ApiRoutes.auth.refresh, {});
            console.log('[Api] Refresh successful. Retrying original request...');
            
            // Retry Original Request
            // (Clone options to avoid mutation issues if any)
            return request(method, path, body, options);

        } catch (refreshError) {
            // Refresh failed (Session truly expired or invalid)
            // Log as info/warn, not error, as this is a normal lifecycle event
            console.warn('[Api] Session expired (Auto-Refresh failed). Clearing local state.');
            window.dispatchEvent(new CustomEvent('auth:cleared'));
            
            const err = new Error('Session expired');
            err.statusCode = 401;
            throw err;
        }
      }

      // Other Errors
      if (!response.ok) {
        const error = new Error(data?.message || 'Request failed');
        error.statusCode = response.status;
        error.data = data;
        error.traceId = traceId;
        throw error;
      }

      return { data, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
         throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Public Interface
  return {
    // Deprecated (kept for compatibility)
    setTokens,
    clearTokens,
    getAccessToken,
    isAuthenticated: () => false,
    
    // HTTP methods
    get: (path, options) => request('GET', path, null, options),
    post: (path, body, options) => request('POST', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    delete: (path, options) => request('DELETE', path, null, options)
  };
})();

window.Api = ApiClient;
