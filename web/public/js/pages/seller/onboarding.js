/**
 * Iron Loot - Seller Onboarding
 */

(function() {
    let currentUser = null;
    let isEmailVerified = false;

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    async function init() {
        const form = Utils.$('#onboardingForm');
        
        // Load Data
        try {
            const verifyStatus = await Api.get('/users/me/verification-status');
            
            const handleUser = (userWrapper) => {
                if (!userWrapper || !userWrapper.data) return;
                currentUser = userWrapper.data;
                
                // Pre-fill form
                Utils.val('#displayName', currentUser.displayName || currentUser.username || '');
                Utils.val('#emailDisplay', currentUser.email);
    
                if (currentUser.profile) {
                    Utils.val('#legalName', currentUser.profile.legalName || '');
                    Utils.val('#country', currentUser.profile.country || '');
                    Utils.val('#address', currentUser.profile.address || '');
                    Utils.val('#city', currentUser.profile.city || '');
                    Utils.val('#postalCode', currentUser.profile.postalCode || '');
                    
                    // Format existing phone if any
                    if (currentUser.profile.phone) {
                        const formatted = formatmxPhone(currentUser.profile.phone);
                        Utils.val('#phone', formatted);
                    }
                }
    
                // Status Check
                checkEmailStatus(verifyStatus.data.emailVerified);
            };

            const userWrapper = AuthState.getUser();
            if (userWrapper && userWrapper.data) {
                handleUser(userWrapper);
            } else {
                window.addEventListener('auth:user-updated', (e) => {
                    handleUser(e.detail);
                }, { once: true });
            }

        } catch (error) {
            console.error('Failed to load onboarding data', error);
            Utils.toast('Error al cargar datos. Recarga la página.', 'error');
        }

        // Setup Form
        form.addEventListener('submit', handleSubmit);
        
         // Terms
        const terms = Utils.$('#acceptTerms');
        terms.addEventListener('change', validateForm); // Changed to validateForm
        
        // Input changes
        form.addEventListener('input', validateForm); // Changed to validateForm

        // Inputs that clear errors
        ['#displayName', '#legalName', '#country', '#address', '#city', '#postalCode'].forEach(selector => {
            const el = Utils.$(selector);
            if(el) {
                el.addEventListener('input', () => validateForm());
            }
        });

        // Phone specific formatter
        const phoneInput = Utils.$('#phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                // Strip non-numeric
                let val = e.target.value.replace(/\D/g, '');
                
                // Truncate to 10
                if (val.length > 10) val = val.substring(0, 10);
                
                // Format: XX XXXX XXXX
                e.target.value = formatmxPhone(val);
                
                validateForm();
            });
        }
    }

    function checkEmailStatus(isVerified) {
        isEmailVerified = !!isVerified;
        
        const statusEl = Utils.$('#emailStatus');
        const helpTextEl = Utils.$('#emailHelpText');
        
        if (isEmailVerified) {
            statusEl.innerHTML = `<span class="material-symbols-outlined text-success" title="Verificado">check_circle</span>`;
            statusEl.style.borderColor = 'var(--border-main)'; 
            helpTextEl.innerHTML = `<span class="text-success">Tu correo está verificado.</span>`;
            helpTextEl.className = "text-xs mt-1 text-success";
        } else {
            statusEl.innerHTML = `
                <button type="button" class="btn btn-ghost text-warning hover:text-warning-dark p-0 flex items-center justify-center w-full h-full" onclick="window.resendVerification()" title="Reenviar Verificación">
                    <span class="material-symbols-outlined">mail</span>
                </button>
            `;
            statusEl.style.borderColor = 'var(--color-warning)';
            
            helpTextEl.innerHTML = `<span class="text-warning">Correo no verificado. Toca el ícono para reenviar.</span>`;
            helpTextEl.className = "text-xs mt-1 text-warning";
        }
        
        validateForm();
    }

    // Helper: Format MX Phone
    function formatmxPhone(val) {
        if (!val) return '';
        // XX XXXX XXXX
        if (val.length <= 2) return val;
        if (val.length <= 6) return `${val.substring(0, 2)} ${val.substring(2)}`;
        return `${val.substring(0, 2)} ${val.substring(2, 6)} ${val.substring(6, 10)}`;
    }

    // Expose resend helper globally
    window.resendVerification = async function() {
        try {
            await Api.post('/users/me/resend-verification');
            Utils.toast('Correo de verificación enviado', 'success');
        } catch (e) {
            if(e.statusCode === 409) {
                 Utils.toast('Tu correo ya está verificado. Recarga la página.', 'success');
                 checkEmailStatus(true);
            } else {
                Utils.toast('Error al enviar correo', 'error');
            }
        }
    };

    // Renamed from updateSubmitButton to validateForm for clarity
    function validateForm() {
        const termsChecked = Utils.$('#acceptTerms').checked;
        const btn = Utils.$('#btnSubmit');
        
        // Simple client-side validation check
        const hasName = Utils.val('#displayName').length > 1;
        const hasLegal = Utils.val('#legalName').length > 2;
        const hasAddress = Utils.val('#address').length > 3;
        const hasPhone = Utils.val('#phone').replace(/\D/g, '').length === 10;

        // Requirement: Email Verified AND Terms Checked AND Fields Filled
        // Exception: If we just want to save profile, we could allow it, but this is "Activate".
        // Let's enforce strictness for "Activation".
        
        if (isEmailVerified && termsChecked && hasName && hasLegal && hasAddress && hasPhone) {
            btn.disabled = false;
            btn.title = "";
        } else {
            btn.disabled = true;
            if (!isEmailVerified) btn.title = "Verifica tu email primero";
            else if (!termsChecked) btn.title = "Acepta los términos";
            else if (!hasPhone) btn.title = "Teléfono debe tener 10 dígitos";
            else btn.title = "Completa todos los campos";
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const btn = Utils.$('#btnSubmit');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Procesando...';

        try {
             // 1. Update Profile Fields
             
             const profileData = {
                 displayName: Utils.val('#displayName'),
                 profile: {
                    phone: Utils.val('#phonePrefix') + Utils.val('#phone').replace(/\D/g, ''),
                    address: Utils.val('#address'),
                    city: Utils.val('#city'),
                    country: Utils.val('#country'),
                    postalCode: Utils.val('#postalCode'),
                    legalName: Utils.val('#legalName')
                 }
             };

             await Api.patch('/users/me', profileData);

             // 2. Enable Seller
             await Api.users.enableSeller({ acceptTerms: true });

             // 3. Success
             Utils.toast('¡Cuenta de Vendedor Activada!', 'success');
             
             // Refresh tokens and state to get new 'isSeller' claim
             if (window.AuthState) {
                try {
                    await window.AuthState.refreshUser();
                } catch(e) {
                    console.warn('Failed to refresh user state', e);
                }
             }
             
             setTimeout(() => {
                 window.location.href = '/profile';
             }, 1000);

        } catch (error) {
            console.error('Onboarding failed', error);
            Utils.toast(error.message || 'Error al activar vendedor', 'error');
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

})();
