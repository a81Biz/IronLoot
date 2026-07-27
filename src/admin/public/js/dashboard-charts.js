function initDashboard() {
  fetchCharts();
  setInterval(refreshKpis, 30000);
}

async function fetchCharts() {
  try {
    const [revenue, users] = await Promise.all([
      fetch('/api/dashboard/revenue-by-day?days=90').then(r => r.json()).catch(() => []),
      fetch('/api/dashboard/users-by-day?days=30').then(r => r.json()).catch(() => []),
    ]);
    renderRevenueChart(Array.isArray(revenue) ? revenue : []);
    renderUsersChart(Array.isArray(users) ? users : []);
  } catch (e) {
    console.warn('Dashboard charts: fetch failed', e);
  }
}

function renderRevenueChart(data) {
  const ctx = document.getElementById('chart-revenue');
  if (!ctx || !window.Chart) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Ingresos MXN',
        data: data.map(d => d.amount),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderUsersChart(data) {
  const ctx = document.getElementById('chart-users');
  if (!ctx || !window.Chart) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Nuevos usuarios',
        data: data.map(d => d.count),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

async function refreshKpis() {
  try {
    const stats = await fetch('/api/dashboard/extended-stats').then(r => r.json()).catch(() => null);
    if (!stats) return;
    setKpi('kpi-users-total', stats.users?.total);
    setKpi('kpi-sellers', stats.users?.sellers);
    setKpi('kpi-auctions-active', stats.auctions?.active);
    setKpi('kpi-bids', stats.bids?.total);
    setKpi('kpi-revenue-today', stats.revenue?.today != null ? `$${Number(stats.revenue.today).toFixed(2)}` : null);
    setKpi('kpi-orders-pending', stats.orders?.pending);
    setKpi('kpi-payments-failed', stats.payments?.failed);
    setKpi('kpi-cfdi-pending', stats.cfdi?.pending);
  } catch (e) { /* silent */ }
}

function setKpi(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = value;
}
