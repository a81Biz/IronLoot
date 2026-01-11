/**
 * Iron Loot - Auctions List Page
 */

(function() {
  // State
  let currentPage = 1;
  let totalPages = 1;
  const limit = 12;

  document.addEventListener('DOMContentLoaded', async () => {
    // Show create button for sellers
    if (Auth.isSeller()) {
      Utils.show('#btnCreateAuction');
    }

    // Load initial auctions
    // Load initial auctions regardless of watchlist status
    try {
        await WatchlistService.init();
    } catch (err) {
        console.warn('Watchlist init failed:', err);
    }
    
    loadAuctions();

    // Setup event listeners
    setupFilters();
    setupPagination();
    
    // Listen for watchlist updates (re-render or just update icons? Re-render is safer/easier)
    window.addEventListener('watchlist:updated', () => {
        // Optimally, just update icons. For MVP, re-render is fine or we can toggle classes.
        // Let's toggle classes for better UX without reload.
        updateWatchlistIcons();
    });
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
      // mine: undefined - Strictly public, never allow private
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
      // Use AuctionFlow orchestrator
      const response = await AuctionFlow.listAuctions(filters);
      
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
            <p class="text-secondary" style="margin-top: var(--spacing-4);">No hay subastas activas</p>
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
      
      // Hook up Watchlist buttons
      grid.querySelectorAll('.btn-watchlist').forEach(btn => {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation(); // Prevent navigation
              const id = btn.dataset.id;
              WatchlistService.toggle(id);
              // Icon update handled by event listener 'watchlist:updated' -> updateWatchlistIcons
              // But we should also visually update immediately for feedback
              updateWatchlistButtonState(btn, WatchlistService.isWatched(id));
          });
      });

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
    } finally {
        // Ensure loading state is cleared if we had a specific spinner element, 
        // but here we replaced grid.innerHTML so it's effectively cleared.
        // However, if we added a separate spinner overlay, we'd remove it here.
        // For strict correctness per QA-2:
        // "always finalize loading in finally{}"
        // Since we write to innerHTML in both try (success/empty) and catch (error), 
        // the "Loading..." text is gone. 
        // But if there were external loading indicators, we would clear them here.
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
    
    const isWatched = WatchlistService.isWatched(auction.id);
    const watchIcon = isWatched ? 'favorite' : 'favorite_border'; // filled vs outline
    const watchClass = isWatched ? 'active' : '';

    return `
      <a href="/auctions/${auction.slug || auction.id}" class="card card-hover auction-card">
        <div class="card-image">
          <img src="${Utils.escapeHtml(imageUrl)}" alt="${Utils.escapeHtml(auction.title)}" loading="lazy">
          <button class="btn btn-icon btn-watchlist ${watchClass}" data-id="${auction.id}" title="Añadir a favoritos">
              <span class="material-symbols-outlined">${watchIcon}</span>
          </button>
        </div>
        <div class="auction-card-content">
          <h3 class="auction-card-title">${Utils.escapeHtml(auction.title)}</h3>
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
  
  function updateWatchlistIcons() {
      Utils.$$('.btn-watchlist').forEach(btn => {
          const id = btn.dataset.id;
          updateWatchlistButtonState(btn, WatchlistService.isWatched(id));
      });
  }
  
  function updateWatchlistButtonState(btn, isWatched) {
      const icon = btn.querySelector('span');
      if (isWatched) {
          icon.textContent = 'favorite'; // Filled
          btn.classList.add('active'); // Optional for color styling
          // In buttons.css we might need a .btn-watchlist.active { color: var(--color-error); }
          // Assuming we can use inline style or existing class if needed.
          // Let's trust Utils.addClass works if styling exists.
          btn.style.color = 'var(--color-error)'; 
          btn.style.backgroundColor = 'white'; // Make it pop
          btn.style.borderRadius = '50%';
      } else {
          icon.textContent = 'favorite_border';
          btn.classList.remove('active');
          btn.style.color = '';
          btn.style.backgroundColor = 'white'; 
          btn.style.borderRadius = '50%';
      }
      
      // Ensure positioning stays absolute top-right (usually handled by CSS)
      // I'll add inline styles to the button in createAuctionCard template to be safe if CSS missing.
      // Modifying createAuctionCard above to add inline styles for positioning.
  }
  
  // Re-define createAuctionCard with positioning styles
  function createAuctionCard(auction) {
    const imageUrl = auction.images?.[0] || 'https://via.placeholder.com/400x300?text=Sin+imagen';
    const currentPrice = Utils.formatCurrency(auction.currentPrice || auction.startingPrice);
    const timeLeft = Utils.formatCountdown(auction.endsAt);
    const isEnding = new Date(auction.endsAt) - new Date() < 3600000;
    
    const isWatched = WatchlistService.isWatched(auction.id);
    const watchIcon = isWatched ? 'favorite' : 'favorite_border';
    const watchColor = isWatched ? 'var(--color-error)' : 'var(--text-secondary)';

    return `
      <a href="/auctions/${auction.slug || auction.id}" class="card card-hover auction-card" style="position: relative;">
        <div class="card-image" style="position: relative;">
          <img src="${imageUrl}" alt="${auction.title}" loading="lazy">
          <button class="btn btn-icon btn-watchlist" data-id="${auction.id}" title="Añadir a favoritos"
            style="position: absolute; top: 8px; right: 8px; background: white; border-radius: 50%; width: 32px; height: 32px; min-width: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: ${watchColor}; z-index: 2;">
              <span class="material-symbols-outlined" style="font-size: 20px;">${watchIcon}</span>
          </button>
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

