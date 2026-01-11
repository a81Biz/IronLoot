/**
 * WalletService
 * @role API Wrapper (Domain: Wallet)
 */
window.WalletService = (function() {

    async function getBalance() {
        const { data } = await Api.get('/wallet/balance');
        return data;
    }

    async function deposit(amount, referenceId) {
        return Api.post('/wallet/deposit', { amount, referenceId });
    }

    async function withdraw(amount, referenceId) {
        return Api.post('/wallet/withdraw', { amount, referenceId });
    }

    async function getHistory(limit = 20) {
        return Api.get('/wallet/history', { params: { limit } });
    }

    return {
        getBalance,
        deposit,
        withdraw,
        getHistory
    };
})();
