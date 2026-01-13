/**
 * Iron Loot - API Route Catalog
 * Centralized registry of all API endpoints.
 * 
 * NOTA: Rutas son relativas a BASE_URL (/api/v1) definido en api-client.js
 * El proxy en main.ts intercepta respuestas de auth y setea cookies HttpOnly.
 */
window.ApiRoutes = {
    auth: {
        register: "/auth/register",
        login: "/auth/login",
        logout: "/auth/logout",
        refresh: "/auth/refresh",
        verifyEmail: "/auth/verify-email",
        resendVerification: "/users/me/resend-verification",
        forgotPassword: "/auth/forgot-password",
        resetPassword: "/auth/reset-password",
        changePassword: "/auth/change-password",
        me: "/auth/me"
    },
    users: {
        me: "/users/me",
        stats: "/users/me/stats",
        settings: "/users/me/settings",
        enableSeller: "/users/me/enable-seller",
        verificationStatus: "/users/me/verification-status",
        publicProfile: (id) => `/users/${id}`,
        ratings: (id) => `/users/${id}/ratings`
    },
    auctions: {
        list: "/auctions",
        create: "/auctions",
        detail: (id) => `/auctions/${id}`,
        update: (id) => `/auctions/${id}`,
        publish: (id) => `/auctions/${id}/publish`,
        end: (id) => `/auctions/${id}/end`,
        placeBid: (id) => `/auctions/${id}/bids`,
        listBids: (id) => `/auctions/${id}/bids`
    },
    bids: {
        myActive: "/bids/my-active",
        myHistory: "/bids/my-history"
    },
    orders: {
        list: "/orders",
        detail: (id) => `/orders/${id}`,
        updateStatus: (id) => `/orders/${id}/status`,
        confirmReceived: (id) => `/orders/${id}/confirm-receipt`,
        ship: (id) => `/orders/${id}/ship`,
        cancel: (id) => `/orders/${id}/cancel`,
        sellerOrders: "/orders/seller-orders"
    },
    wallet: {
        balance: "/wallet/balance",
        deposit: "/wallet/deposit",
        withdraw: "/wallet/withdraw",
        history: "/wallet/history"
    },
    watchlist: {
        list: "/watchlist",
        add: "/watchlist",
        remove: (id) => `/watchlist/${id}`
    },
    notifications: {
        list: "/notifications",
        unreadCount: "/notifications/unread-count",
        readAll: "/notifications/read-all",
        markRead: (id) => `/notifications/${id}/read`
    },
    payments: {
        initiate: "/payments/initiate",
        methods: "/payments/methods",
        process: "/payments/process"
    },
    disputes: {
        create: "/disputes",
        list: "/disputes",
        detail: (id) => `/disputes/${id}`,
        addMessage: (id) => `/disputes/${id}/messages`,
        uploadEvidence: (id) => `/disputes/${id}/evidence`,
        resolve: (id) => `/disputes/${id}/resolve`
    },
    ratings: {
        create: "/ratings",
        listByUser: (userId) => `/users/${userId}/ratings`
    },
    webViews: {
        payments: "/payments",
        wonAuctions: "/won-auctions",
        privacy: "/privacy",
        terms: "/terms"
    },
    seller: {
        dashboard: "/seller/dashboard",
        profile: "/seller/profile"
    }
};
