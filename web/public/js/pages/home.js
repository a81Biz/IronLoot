/**
 * Iron Loot - Home Page
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedAuctions();
  });

  /**
   * Load featured auctions
   */
  async function loadFeaturedAuctions() {
    const container = Utils.$('#featuredAuctions');
    if (!container) return;

    try {
      const { data: auctions } = await Api.auctions.list({ 
        status: 'ACTIVE', 
        limit: 6 
      });

      if (auctions.length === 0) {
        container.innerHTML = `
          <div class="text-center text-secondary" style="grid-column: 1/-1; padding: var(--spacing-8);">
            <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">gavel</span>
            <p style="margin-top: var(--spacing-4);">No hay subastas activas en este momento</p>
          </div>
        `;
        return;
      }

      container.innerHTML = auctions.map(auction => createAuctionCard(auction)).join('');
    } catch (error) {
      console.error('Failed to load auctions:', error);
      container.innerHTML = `
        <div class="text-center text-secondary" style="grid-column: 1/-1; padding: var(--spacing-8);">
          <p>Error al cargar las subastas</p>
          <button class="btn btn-secondary" onclick="location.reload()">Reintentar</button>
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
    const isEnding = new Date(auction.endsAt) - new Date() < 3600000; // Less than 1 hour

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
})();
