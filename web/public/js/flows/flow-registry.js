/**
 * Flow Registry
 * @description Documentation of available flows and their steps.
 * Useful for debugging and understanding the system.
 */
window.FlowRegistry = {
    profileUpdate: {
        name: 'Profile Update',
        steps: [
            { id: '1', call: 'UserService.updateMe', note: 'Patch DB' },
            { id: '2', call: 'AuthState.setTokens OR refreshUser', note: 'Update Identity Source of Truth' },
            { id: '3', call: 'UI Update', note: 'Via EVENTS.USER_UPDATED' }
        ]
    },
    sellerActivation: {
        name: 'Seller Activation',
        steps: [
            { id: '1', call: 'UserService.updateMe', note: 'Save Legal Name/Details' },
            { id: '2', call: 'SellerService.enableSeller', note: 'Set isSeller=true in DB' },
            { id: '3', call: 'AuthState.setTokens OR refreshUser', note: 'Get new Token with isSeller claim' },
            { id: '4', call: 'Redirect', note: 'To Profile or Dashboard' }
        ]
    }
};
