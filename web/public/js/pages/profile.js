/**
 * Iron Loot - Profile Page
 */

(function() {
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    async function init() {
         // Always fetch fresh data to ensure we have latest schema (username, legalName, etc.)
         if (Api.isAuthenticated()) {
             // Use AuthState instead of duplicate call
             const initProfile = (res) => {
                 if (res && res.data) {
                     currentUser = res.data;
                     renderProfile();
                     setupEventListeners();
                 }
             };

             const userWrapper = AuthState.getUser();
             if (userWrapper && userWrapper.data) {
                 initProfile(userWrapper);
             } else {
                 window.addEventListener('auth:user-updated', (e) => {
                     initProfile(e.detail);
                 }, { once: true });
             }
         } else {
              window.location.href = '/login?return=/profile';
         }
    }

    function renderProfile() {
        if (!currentUser) return;

        // 1. Header & Inputs
        Utils.text('#headerUsername', currentUser.username);
        Utils.val('#displayName', currentUser.displayName || '');
        Utils.val('#emailDisplay', currentUser.email);

        const rolesContainer = Utils.$('#profileRoles');
        if (rolesContainer && currentUser.roles) {
            // Safe check for roles array, though standard user might not have it in UserResponseDto unless mapped?
            // UsersService maps 'isSeller'. 'roles' was in old AuthResponse likely.
            // Let's check currentUser structure. If roles missing, we skip or infer.
            const role = currentUser.isSeller ? 'SELLER' : 'BUYER'; 
            // Better to show explicit badge if available.
            // If API doesn't return roles array in /users/me, we infer from isSeller.
            const badges = [];
            if (currentUser.state === 'ACTIVE') badges.push('<span class="badge bg-success text-white">Activo</span>');
            if (currentUser.isSeller) badges.push('<span class="badge bg-primary text-white">Vendedor</span>');
            else badges.push('<span class="badge bg-secondary text-white">Comprador</span>');
            
            rolesContainer.innerHTML = badges.join('');
        }

        // 2. Seller Profile
        const seller = currentUser || {};
        
        if (seller.isSeller) {
            // SHOW Seller Info
            Utils.hide('#sellerPromoSelect');
            Utils.show('#sellerInfoSection');
            
            Utils.text('#sellerLegalName', seller.profile.legalName || 'No configurado');
            Utils.text('#sellerLocation', `${seller.profile.city || ''}, ${seller.profile.country || ''}`);
            Utils.text('#sellerAddress', `${seller.profile.address || ''} ${seller.profile.postalCode || ''}`);
            
            // Badge
            const badge = Utils.$('#sellerStatusBadge');
            if (badge) {
                badge.innerHTML = `<span class="badge bg-success text-white">Vendedor Activo</span>`;
            }

        } else {
            // SHOW Promo
            Utils.show('#sellerPromoSelect');
            Utils.hide('#sellerInfoSection');
             
            const badge = Utils.$('#sellerStatusBadge');
            if (badge) {
                badge.innerHTML = `<span class="badge bg-surface-alt border border-border-main">Usuario Standard</span>`;
            }
        }
    }

    function setupEventListeners() {
        const form = Utils.$('#profileForm');
        if (form) {
            form.addEventListener('submit', handleUpdateProfile);
        }
    }

    async function handleUpdateProfile(e) {
        e.preventDefault();
        const btn = Utils.$('#btnSaveProfile');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Guardando...';

        try {
            const displayName = Utils.val('#displayName');
            
            // Only sending displayName for now as email is disabled
            const updateData = { displayName };

            await Api.patch('/users/me', updateData);
            
            // Refresh token and local state to ensure everything is in sync
            await AuthState.refreshUser();
            
            Utils.toast('Perfil actualizado correctamente', 'success');
            renderProfile(); // Re-render to ensure consistency

        } catch (error) {
            console.error('Update failed', error);
            Utils.toast(error.message || 'Error al actualizar perfil', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

})();
