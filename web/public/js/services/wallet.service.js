/**
 * WalletService
 * @role API Wrapper (Domain: Wallet)
 */
window.WalletService = (function() {

    async function getBalance() {
        const { data } = await Api.get(ApiRoutes.wallet.balance);
        return data;
    }

    async function deposit(amount, referenceId) {
        return Api.post(ApiRoutes.wallet.deposit, { amount, referenceId });
    }

    async function initiateDeposit(amount, provider) {
        return Api.post(ApiRoutes.payments.initiate, { amount, provider });
    }

    async function processPayment(paymentData) {
        return Api.post(ApiRoutes.payments.process, paymentData);
    }

    async function withdraw(amount, referenceId) {
        return Api.post(ApiRoutes.wallet.withdraw, { amount, referenceId });
    }

    async function getHistory(limit = 20) {
        return Api.get(ApiRoutes.wallet.history, { params: { limit } });
    }

    return {
        getBalance,
        deposit,
        initiateDeposit,
        processPayment,
        withdraw,
        getHistory
    };
})();
