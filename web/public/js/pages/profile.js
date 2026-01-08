/**
 * Iron Loot - Profile Page
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for AuthState to be ready if possible, or just call Auth.getUser()
        // AuthState usually hydrates on page load.
        if (Auth.isLoggedIn()) {
            renderProfile();
        } else {
            // Should be handled by route guard but double check
             window.location.href = '/login?return=/profile';
        }

        setupEnableSeller();
    });

    function renderProfile() {
        const user = Auth.getUser();
        if (!user) return;

        Utils.$('#profileName').textContent = user.displayName || user.username;
        Utils.$('#profileEmail').textContent = user.email;

        const rolesContainer = Utils.$('#profileRoles');
        if (rolesContainer && user.roles) {
            rolesContainer.innerHTML = user.roles.map(role => `
                <span class="badge ${role === 'ADMIN' ? 'bg-error text-white' : 'bg-primary text-white'}">${role}</span>
            `).join('');
        }

        // Seller Status
        if (Auth.isSeller()) {
            Utils.hide('#sellerSection');
            Utils.show('#sellerActiveSection');
        } else {
            Utils.show('#sellerSection');
            Utils.hide('#sellerActiveSection');
        }
    }

    function setupEnableSeller() {
        const btn = Utils.$('#btnEnableSeller');
        if (btn) {
            btn.addEventListener('click', async () => {
                const confirmed = confirm('¿Estás seguro de que quieres activar las funciones de vendedor?');
                if (!confirmed) return;

                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Activando...';

                try {
                    await Api.users.enableSeller();
                    Utils.toast('¡Felicidades! Ahora eres vendedor.', 'success');
                    
                    // Rehydrate Auth State triggers UI update
                    await AuthState.init(); // Re-fetches /auth/me
                    
                    // Re-render local view
                    renderProfile();
                    
                } catch (error) {
                    console.error('Failed to enable seller:', error);
                    Utils.toast(error.message || 'Error al activar vendedor', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">storefront</span> Activar Cuenta de Vendedor';
                }
            });
        }
    }
})();
