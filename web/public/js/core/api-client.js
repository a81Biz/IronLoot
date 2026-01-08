/**
 * Iron Loot - API Client
 * Handles all communication with the backend API
 */

const ApiClient = (function() {
  // Configuration
  const BASE_URL = window.APP_CONFIG?.apiUrl || '/api/v1';
  const TIMEOUT = 30000;

  // Token storage keys
  const ACCESS_TOKEN_KEY = 'ironloot_access_token';
  const REFRESH_TOKEN_KEY = 'ironloot_refresh_token';

  // State
  let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  let isRefreshing = false;
  let refreshQueue = [];

  /**
   * Helper to set cookie
   */
  function setCookie(name, value, days) {
      let expires = "";
      if (days) {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
  }

  /**
   * Helper to delete cookie
   */
  function deleteCookie(name) {
      document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  /**
   * Set authentication tokens
   */
  function setTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    
    // Set cookie for SSR
    setCookie('access_token', access, 7); // 7 days matching refresh approx or generic
  }

  /**
   * Clear authentication tokens
   */
  function clearTokens() {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    
    // Clear cookie
    deleteCookie('access_token');
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated() {
    return !!accessToken;
  }

  /**
   * Get access token
   */
  function getAccessToken() {
    return accessToken;
  }

  /**
   * Build URL with query parameters
   */
  function buildUrl(path, params = {}) {
    const url = new URL(path, window.location.origin);
    url.pathname = BASE_URL + url.pathname;
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  }

  /**
   * Get default headers
   */
  function getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  /**
   * Refresh access token
   */
  async function refreshAccessToken() {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  /**
   * Handle 401 Unauthorized
   */
  async function handleUnauthorized(retryFn) {
    if (!refreshToken) {
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Unauthorized');
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject, retryFn });
      });
    }

    isRefreshing = true;

    try {
      await refreshAccessToken();
      
      // Process queued requests
      refreshQueue.forEach(({ resolve, retryFn }) => {
        retryFn().then(resolve);
      });
      refreshQueue = [];
      
      return retryFn();
    } catch (error) {
      refreshQueue.forEach(({ reject }) => reject(error));
      refreshQueue = [];
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * Core request method
   */
  async function request(method, path, body = null, options = {}) {
    const url = buildUrl(path, options.params);
    const headers = getHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const traceId = response.headers.get('x-trace-id');

      // Handle 401 Unauthorized
      if (response.status === 401) {
        return handleUnauthorized(() => request(method, path, body, options));
      }

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        const error = new Error(data?.message || 'Request failed');
        error.statusCode = response.status;
        error.data = data;
        error.traceId = traceId;
        throw error;
      }

      return { data, status: response.status, traceId };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  // Public API
  return {
    // Token management
    setTokens,
    clearTokens,
    isAuthenticated,
    getAccessToken,

    // HTTP methods
    get: (path, options) => request('GET', path, null, options),
    post: (path, body, options) => request('POST', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    delete: (path, options) => request('DELETE', path, null, options),

    // --- Auth API ---
    auth: {
      async login(email, password) {
        const { data } = await request('POST', '/auth/login', { email, password });
        setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
        return data;
      },

      async register(userData) {
        const { data } = await request('POST', '/auth/register', userData);
        return data;
      },

      async logout() {
        try {
          await request('POST', '/auth/logout');
        } finally {
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      },

      async me() {
        const { data } = await request('GET', '/auth/me');
        return data;
      },

      async forgotPassword(email) {
        await request('POST', '/auth/forgot-password', { email });
      },

      async resetPassword(token, newPassword) {
        await request('POST', '/auth/reset-password', { token, newPassword });
      },

      async verifyEmail(token) {
        await request('POST', '/auth/verify-email', { token });
      },
    },

    // --- Bids API ---
    bids: {
      async getMyActiveBids() {
        const { data } = await request('GET', '/bids/my-active');
        return data;
      },
      async getBidsForAuction(auctionId) {
        const { data } = await request('GET', `/auctions/${auctionId}/bids`);
        return data;
      },
      async placeBid(auctionId, amount) {
        const { data } = await request('POST', `/auctions/${auctionId}/bids`, { amount });
        return data;
      },
    },

    // --- Auctions API ---
    auctions: {
      async list(filters = {}) {
        const { data } = await request('GET', '/auctions', null, { params: filters });
        return data;
      },

      async getById(id) {
        const { data } = await request('GET', `/auctions/${id}`);
        return data;
      },

      async create(auctionData) {
        const { data } = await request('POST', '/auctions', auctionData);
        return data;
      },

      async update(id, auctionData) {
        const { data } = await request('PATCH', `/auctions/${id}`, auctionData);
        return data;
      },

      async publish(id) {
        const { data } = await request('POST', `/auctions/${id}/publish`);
        return data;
      },

      async placeBid(auctionId, amount) {
        const { data } = await request('POST', `/auctions/${auctionId}/bids`, { amount });
        return data;
      },

      async getBids(auctionId) {
        const { data } = await request('GET', `/auctions/${auctionId}/bids`);
        return data;
      },
    },

    // --- Wallet API ---
    wallet: {
      async getBalance() {
        const { data } = await request('GET', '/wallet/balance');
        return data;
      },

      async deposit(amount, referenceId) {
        const { data } = await request('POST', '/wallet/deposit', { amount, referenceId });
        return data;
      },

      async withdraw(amount, referenceId) {
        const { data } = await request('POST', '/wallet/withdraw', { amount, referenceId });
        return data;
      },

      async getHistory(limit = 20) {
        const { data } = await request('GET', '/wallet/history', null, { params: { limit } });
        return data;
      },
    },

    // --- Notifications API ---
    notifications: {
      async list() {
        const { data } = await request('GET', '/notifications');
        return data;
      },

      async getUnreadCount() {
        const { data } = await request('GET', '/notifications/unread-count');
        return data;
      },

      async markAsRead(id) {
        await request('PATCH', `/notifications/${id}/read`);
      },

      async markAllAsRead() {
        await request('PATCH', '/notifications/read-all');
      },
    },

    // --- Watchlist API ---
    watchlist: {
      async list() {
        const { data } = await request('GET', '/watchlist');
        return data;
      },
      async add(auctionId) {
        await request('POST', '/watchlist', { auctionId });
      },
      async remove(auctionId) {
        await request('DELETE', `/watchlist/${auctionId}`);
      }
    },

    // --- Users API ---
    users: {
      async enableSeller() {
        const { data } = await request('POST', '/users/me/enable-seller');
        return data;
      },
      async getStats() {
          const { data } = await request('GET', '/users/me/stats');
          return data;
      },
      async getSettings() {
          const { data } = await request('GET', '/users/me/settings');
          return data;
      },
      async updateSettings(settings) {
          const { data } = await request('PATCH', '/users/me/settings', settings);
          return data;
      }
    },

    // --- Disputes API ---
    disputes: {
      async list() {
        const { data } = await request('GET', '/disputes');
        return data;
      },
      async getById(id) {
        const { data } = await request('GET', `/disputes/${id}`);
        return data;
      },
      async create(data) {
        const response = await request('POST', '/disputes', data);
        return response.data;
      }
    }
  };
})();

// Make it globally available
window.Api = ApiClient;
