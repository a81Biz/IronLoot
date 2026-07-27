// Iron Loot Admin Panel — Client JS

// ── Toast notifications ──────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  toast.addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Active nav item ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Highlight current nav link by URL (fallback for SSR activePage)
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(el => {
    const href = el.getAttribute('href');
    if (href && href !== '/' && path.startsWith(href)) {
      el.classList.add('active');
    } else if (href === '/' && path === '/') {
      el.classList.add('active');
    }
  });
});
