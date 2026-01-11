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
     */
    async function loadHistory(filters) {
        return WalletService.getHistory(filters);
    }

    /**
     * Deposit Funds
     * @param {Object} params { amount, method }
     */
    async function deposit({ amount, method }) {
        const res = await WalletService.deposit(amount, method); // Assuming signature
        // If immediate success:
        await syncAfterMutation();
        return res;
    }

    /**
     * Withdraw Funds
     * @param {Object} params { amount, destination }
     */
    async function withdraw({ amount, destination }) {
        const res = await WalletService.withdraw(amount, destination);
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
                 WalletService.getHistory({ limit: 5 }) // Fresh history
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
