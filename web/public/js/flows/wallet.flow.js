/**
 * WalletFlow
 * @role Orchestrator (Wallet & Funds)
 * @description Handles Balance, History, Deposits, Withdrawals, and Synchronization.
 * @depends WalletService
 */
window.WalletFlow = (function() {

    /**
     * Load Balance
     */
    async function loadBalance() {
        return WalletService.getBalance();
    }

    /**
     * Load History
     * @param {number} [limit]
     */
    async function loadHistory(limit) {
        return WalletService.getHistory(limit);
    }

    /**
     * Deposit Funds
     * @param {Object} params { amount, referenceId }
     */
    async function deposit({ amount, referenceId }) {
        const res = await WalletService.deposit(amount, referenceId);
        await syncAfterMutation();
        return res;
    }

    /**
     * Withdraw Funds
     * @param {Object} params { amount, referenceId }
     */
    async function withdraw({ amount, referenceId }) {
        const res = await WalletService.withdraw(amount, referenceId);
        await syncAfterMutation();
        return res;
    }

    /**
     * Sync After Mutation
     * Critical for keeping UI consistent after money moves.
     */
    async function syncAfterMutation() {
        try {
            // Parallel fetch to be efficient
            const [balance, history] = await Promise.all([
                 WalletService.getBalance(),
                 WalletService.getHistory(5)
            ]);
            
            // Broadcast updates to components (Navbar, WalletWidget, etc)
            // or return them. Broadcasting is easier for "Flow updates UI".
            // Legacy code used custom events or direct DOM manipulation.
            // Let's emit events for components to react.
            
            window.dispatchEvent(new CustomEvent('wallet:updated', { 
                detail: { balance, history } 
            }));

        } catch(e) {
            console.warn('[WalletFlow] Sync failed', e);
        }
    }

    return {
        loadBalance,
        loadHistory,
        deposit,
        withdraw,
        syncAfterMutation
    };
})();
