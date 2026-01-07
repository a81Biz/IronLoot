/**
 * Iron Loot - Auth Pages (Login, Register, Recovery)
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Login Form
    const loginForm = Utils.$('#loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }

    // Register Form
    const registerForm = Utils.$('#registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', handleRegister);
    }

    // Recovery Form
    const recoveryForm = Utils.$('#recoveryForm');
    if (recoveryForm) {
      recoveryForm.addEventListener('submit', handleRecovery);
    }

    // Password visibility toggle
    Utils.$$('.password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('.material-symbols-outlined');
        
        if (input.type === 'password') {
          input.type = 'text';
          icon.textContent = 'visibility_off';
        } else {
          input.type = 'password';
          icon.textContent = 'visibility';
        }
      });
    });
  });

  /**
   * Handle login form submission
   */
  async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = Utils.$('#loginError');
    
    const email = form.email.value.trim();
    const password = form.password.value;

    // Clear previous errors
    if (errorEl) errorEl.style.display = 'none';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    try {
      await Auth.login(email, password);
      
      // Redirect to dashboard or previous page
      const returnUrl = new URLSearchParams(window.location.search).get('return') || '/dashboard';
      window.location.href = returnUrl;
    } catch (error) {
      console.error('Login failed:', error);
      
      if (errorEl) {
        let message = error.message || 'Credenciales inválidas';
        
        // Handle specific error codes
        if (error.data?.error?.code === 'USER_NOT_VERIFIED') {
          message = 'Verificación de correo requerida. Por favor revisa tu bandeja de entrada.';
        } else if (error.data?.error?.message) {
          message = Array.isArray(error.data.error.message) 
            ? error.data.error.message.join(', ') 
            : error.data.error.message;
        }

        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    }
  }

  /**
   * Handle register form submission
   */
  async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = Utils.$('#registerError');
    
    const email = form.email.value.trim();
    const username = form.username.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    // Clear previous errors
    if (errorEl) errorEl.style.display = 'none';

    // Validate passwords match
    if (password !== confirmPassword) {
      if (errorEl) {
        errorEl.textContent = 'Las contraseñas no coinciden';
        errorEl.style.display = 'block';
      }
      return;
    }

    // Validate password length
    if (password.length < 8) {
      if (errorEl) {
        errorEl.textContent = 'La contraseña debe tener al menos 8 caracteres';
        errorEl.style.display = 'block';
      }
      return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    try {
      await Auth.register({ email, username, password });
      
      // Auto login after registration
      await Auth.login(email, password);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Registration failed:', error);
      
      if (errorEl) {
        let message = error.message || 'Error al registrarse';

        // Parse detailed validation errors
        if (error.data?.error?.message) {
           message = Array.isArray(error.data.error.message)
            ? error.data.error.message.join(', ')
            : error.data.error.message;
        }

        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    }
  }

  /**
   * Handle recovery form submission
   */
  async function handleRecovery(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = Utils.$('#recoveryError');
    const successEl = Utils.$('#recoverySuccess');
    
    const email = form.email.value.trim();

    // Clear previous messages
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    try {
      await Api.auth.forgotPassword(email);
      
      if (successEl) {
        successEl.textContent = 'Se ha enviado un enlace de recuperación a tu correo';
        successEl.style.display = 'block';
      }
      
      // Clear form
      form.reset();
    } catch (error) {
      console.error('Recovery failed:', error);
      
      if (errorEl) {
        errorEl.textContent = error.message || 'Error al enviar el enlace';
        errorEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    }
  }
})();
