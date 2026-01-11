/**
 * Iron Loot - Profile Page
 * @role Page Controller
 * @depends AuthState, ProfileFlow, UserService, Utils
 */

(function() {
    // Local State
    let richProfileData = {}; // "Rich" data (legal name, address, etc) from UserService

    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        init();
    });

    async function init() {
         // Guard Check
         if (!AuthState.guard()) return;

         // 1. Subscribe to Identity Changes (Token Source of Truth)
         window.addEventListener(AuthState.EVENTS.USER_UPDATED, () => {
             renderProfile(); // Re-render when token changes (e.g. displayName update)
         });

         // 2. Initial Render (if already hydrated)
         renderProfile();

         // 3. Fetch Rich Data (Local state only)
         try {
             const res = await UserService.getMe();
             if (res && res.data) {
                 richProfileData = res.data;
                 renderSellerSection(); // Rich data updates seller section details
             }
         } catch (e) {
             console.warn('Failed to fetch rich profile', e);
         }
    }

    function setupEventListeners() {
        const form = Utils.$('#profileForm');
        if (form) {
            form.removeEventListener('submit', handleUpdateProfile);
            form.addEventListener('submit', handleUpdateProfile);
        }
    }

    function renderProfile() {
        // Identity from Token
        const user = AuthState.getUser()?.data;
        if (!user) return;

        // Header
        const displayName = AuthState.getDisplayName() || 'Usuario';
        Utils.text('#headerUsername', displayName);
        
        // Form Fields (Identity)
        // input might be dirty if user is typing, but for now we sync on load/update.
        // If we want to avoid overwriting user input while typing, we'd need checks.
        // Assuming this runs on "save success" mostly.
        const nameInput = Utils.$('#displayName');
        if (nameInput && document.activeElement !== nameInput) {
             nameInput.value = displayName;
        }
        
        Utils.val('#emailDisplay', user.email || '');

        // Roles / Badges
        const rolesContainer = Utils.$('#profileRoles');
        if (rolesContainer) {
            let rolesHtml = '';
            if (AuthState.isSeller()) {
                rolesHtml += '<span class="badge badge-primary">Vendedor</span>';
            } else {
                rolesHtml += '<span class="badge badge-secondary">Comprador</span>';
            }
            if (user.emailVerified) {
                rolesHtml += '<span class="badge badge-success">Verificado</span>';
            }
            rolesContainer.innerHTML = rolesHtml;
        }

        // Seller Section (Visibility depends on Identity)
        renderSellerSection();
    }

    function renderSellerSection() {
        // Identity Check
        const isSeller = AuthState.isSeller();
        
        const promo = Utils.$('#sellerPromoSelect');
        const info = Utils.$('#sellerInfoSection');
        const badge = Utils.$('#sellerStatusBadge');

        if (!promo || !info) return;

        if (isSeller) {
            Utils.hide(promo);
            Utils.show(info);
            if (badge) badge.innerHTML = '<span class="badge badge-primary">Cuenta de Vendedor Activa</span>';
            
            // Populate Details from Rich Data (not Token)
            const p = richProfileData.profile || {};
            
            Utils.text('#sellerLegalName', p.legalName || 'No registrado');
            
            const location = [p.city, p.country].filter(Boolean).join(', ');
            Utils.text('#sellerLocation', location || 'No registrada');
            
            Utils.text('#sellerAddress', p.address || 'No registrada');

        } else {
            Utils.show(promo);
            Utils.hide(info);
            if (badge) badge.innerHTML = '';
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
            
            // Call Flow (Orchestrator)
            // It will handle API + Token Refresh + Event Emission
            await ProfileFlow.updateDisplayName({ displayName });
            
            Utils.toast('Perfil actualizado correctamente', 'success');
            // renderProfile() will trigger automatically via USER_UPDATED event

        } catch (error) {
            console.error('Update failed', error);
            Utils.toast(error.message || 'Error al actualizar perfil', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

})();
