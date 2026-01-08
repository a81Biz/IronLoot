/**
 * Iron Loot - User Settings
 * Implements Spec v0.2.3: GET/PATCH /users/me/settings
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadSettings();
        setupForm();
    });

    async function loadSettings() {
        const form = document.getElementById('settingsForm');
        
        try {
            const settings = await Api.users.getSettings();

            // Populate Form
            if (settings.language) {
                form.language.value = settings.language;
            }
            
            if (settings.notifications) {
                form['notifications.email'].checked = !!settings.notifications.email;
                form['notifications.inApp'].checked = !!settings.notifications.inApp;
            }

        } catch (error) {
            console.error('Load settings failed:', error);
            if (error.statusCode === 401) {
                window.location.href = '/login?return=/settings';
                return;
            }
            showAlert('Error al cargar la configuración.', 'error');
        }
    }

    function setupForm() {
        const form = document.getElementById('settingsForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('btnSave');
            btn.disabled = true;
            btn.textContent = 'Guardando...';
            hideAlert();

            // Construct payload
            const payload = {
                language: form.language.value,
                notifications: {
                    email: form['notifications.email'].checked,
                    inApp: form['notifications.inApp'].checked
                }
            };

            try {
                await Api.users.updateSettings(payload);

                showAlert('Configuración guardada exitosamente.', 'success');
                setTimeout(() => hideAlert(), 3000);

            } catch (error) {
                console.error('Save failed:', error);
                
                if (error.statusCode === 400) {
                     const data = error.data;
                     const messages = Array.isArray(data.message) ? data.message.join('<br>') : data.message;
                     showAlert(`Error de validación:<br>${messages}`, 'warning');
                     return;
                }
                
                if (error.statusCode === 401) {
                    window.location.href = '/login?return=/settings';
                    return;
                }

                showAlert('Error al guardar. Intenta de nuevo.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar Cambios';
            }
        });
    }

    function showAlert(message, type = 'info') {
        const alert = document.getElementById('settingsAlert');
        alert.innerHTML = message;
        alert.className = `alert alert-${type}`;
        alert.classList.remove('hidden');
    }

    function hideAlert() {
        const alert = document.getElementById('settingsAlert');
        alert.classList.add('hidden');
    }
})();
