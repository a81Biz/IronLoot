/**
 * Iron Loot - Auctions List Page
 */

(function() {
  // State
  let currentPage = 1;
  let totalPages = 1;
  const limit = 12;

  document.addEventListener('DOMContentLoaded', () => {
    // Show create button for sellers
    if (Auth.isSeller()) {
      Utils.show('#btnCreateAuction');
    }

    // Load initial auctions
    loadAuctions();

    // Setup event listeners
    setupFilters();
    setupPagination();
  });

  /**
   * Setup filter event listeners
   */
  function setupFilters() {
    const applyBtn = Utils.$('#btnApplyFilters');
    const searchInput = Utils.$('#filterSearch');

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        currentPage = 1;
        loadAuctions();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          currentPage = 1;
          loadAuctions();
        }
      });
    }

    // Also load from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery && searchInput) {
      searchInput.value = searchQuery;
    }
  }

  /**
   * Setup pagination
   */
  function setupPagination() {
    Utils.$('#prevPage')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadAuctions();
      }
    });

    Utils.$('#nextPage')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadAuctions();
      }
    });
  }

  /**
   * Get current filters
   */
  function getFilters() {
    return {
      search: Utils.$('#filterSearch')?.value || undefined,
      status: Utils.$('#filterStatus')?.value || undefined,
      sort: Utils.$('#filterSort')?.value || undefined,
      page: currentPage,
      limit: limit,
    };
  }

  /**
   * Load auctions
   */
  async function loadAuctions() {
    const grid = Utils.$('#auctionsGrid');
    const countEl = Utils.$('#auctionsCount');
    const pagination = Utils.$('#pagination');
    
    if (!grid) return;

    grid.innerHTML = `
      <p class="text-secondary text-center" style="grid-column: 1/-1; padding: var(--spacing-8);">
        Cargando subastas...
      </p>
    `;

    try {
      const filters = getFilters();
      const response = await Api.auctions.list(filters);
      
      const auctions = response.data || response;
      const meta = response.meta || { total: auctions.length, page: 1, totalPages: 1 };

      totalPages = meta.totalPages || 1;

      // Update count
      if (countEl) {
        countEl.textContent = `${meta.total} subasta${meta.total !== 1 ? 's' : ''} encontrada${meta.total !== 1 ? 's' : ''}`;
      }

      // No results
      if (auctions.length === 0) {
        grid.innerHTML = `
          <div class="text-center" style="grid-column: 1/-1; padding: var(--spacing-12);">
            <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3;">search_off</span>
            <p class="text-secondary" style="margin-top: var(--spacing-4);">No se encontraron subastas</p>
            <button class="btn btn-secondary" style="margin-top: var(--spacing-4);" onclick="location.href='/auctions'">
              Ver todas
            </button>
          </div>
        `;
        if (pagination) pagination.style.display = 'none';
        return;
      }

      // Render auctions
      grid.innerHTML = auctions.map(auction => createAuctionCard(auction)).join('');

      // Update pagination
      if (pagination && totalPages > 1) {
        pagination.style.display = 'flex';
        renderPagination();
      } else if (pagination) {
        pagination.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to load auctions:', error);
      grid.innerHTML = `
        <div class="text-center" style="grid-column: 1/-1; padding: var(--spacing-8);">
          <p class="text-error">Error al cargar las subastas</p>
          <button class="btn btn-secondary" style="margin-top: var(--spacing-4);" onclick="location.reload()">
            Reintentar
          </button>
        </div>
      `;
    }
  }

  /**
   * Create auction card HTML
   */
  function createAuctionCard(auction) {
    const imageUrl = auction.images?.[0] || 'https://via.placeholder.com/400x300?text=Sin+imagen';
    const currentPrice = Utils.formatCurrency(auction.currentPrice || auction.startingPrice);
    const timeLeft = Utils.formatCountdown(auction.endsAt);
    const isEnding = new Date(auction.endsAt) - new Date() < 3600000;

    return `
      <a href="/auctions/${auction.slug || auction.id}" class="card card-hover auction-card">
        <div class="card-image">
          <img src="${imageUrl}" alt="${auction.title}" loading="lazy">
        </div>
        <div class="auction-card-content">
          <h3 class="auction-card-title">${auction.title}</h3>
          <div class="auction-card-meta">
            <div>
              <p class="auction-card-price-label">Precio actual</p>
              <p class="auction-card-price">${currentPrice}</p>
            </div>
            <div class="auction-card-time">
              <p class="auction-card-time-label">Termina en</p>
              <p class="auction-card-time-value ${isEnding ? 'text-error' : ''}">${timeLeft}</p>
            </div>
          </div>
          <p class="auction-card-bids">${auction.bidCount || 0} pujas</p>
        </div>
      </a>
    `;
  }

  /**
   * Render pagination numbers
   */
  function renderPagination() {
    const container = Utils.$('#paginationNumbers');
    if (!container) return;

    let html = '';
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      html += `
        <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        loadAuctions();
      });
    });

    // Update prev/next buttons
    Utils.$('#prevPage').disabled = currentPage === 1;
    Utils.$('#nextPage').disabled = currentPage === totalPages;
  }
})();
