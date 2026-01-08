/**
 * Iron Loot - Auction Detail Page
 */

(function() {
  let auction = null;
  let countdownInterval = null;

  document.addEventListener('DOMContentLoaded', () => {
    loadAuction();
  });

  /**
   * Load auction data
   */
  async function loadAuction() {
    // Get auction ID/slug from URL
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    try {
      auction = await Api.auctions.getById(auctionId);
      renderAuction();
      loadBidHistory();
      setupEventListeners();
      startCountdown();
    } catch (error) {
      console.error('Failed to load auction:', error);
      Utils.$('#auctionTitle').textContent = 'Subasta no encontrada';
    }
  }

  /**
   * Render auction data
   */
  function renderAuction() {
    // Title
    Utils.$('#auctionTitle').textContent = auction.title;
    document.title = `${auction.title} - Iron Loot`;

    // Description
    Utils.$('#auctionDescription').textContent = auction.description || 'Sin descripción';

    // Price
    const currentPrice = auction.currentPrice || auction.startingPrice;
    Utils.$('#currentPrice').textContent = Utils.formatCurrency(currentPrice);

    // Status
    const statusEl = Utils.$('#auctionStatus');
    if (statusEl) {
      const isActive = auction.status === 'ACTIVE';
      statusEl.className = `auction-status-badge ${isActive ? 'active' : ''}`;
      statusEl.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 16px;">${isActive ? 'schedule' : 'check_circle'}</span>
        ${getStatusText(auction.status)}
      `;
    }

    // Images
    renderImages();

    // Seller
    if (auction.seller) {
      Utils.$('#sellerName').textContent = auction.seller.displayName || auction.seller.username;
    }

    // Bid form visibility
    if (Auth.isLoggedIn()) {
      Utils.show('#bidForm');
      Utils.hide('#authRequired');
      setupBidSuggestions(currentPrice);
    } else {
      Utils.hide('#bidForm');
      Utils.show('#authRequired');
    }

    // Min bid
    const minBid = currentPrice + 1;
    Utils.$('#minBid').textContent = Utils.formatCurrency(minBid);
    Utils.$('#bidAmount').min = minBid;
    Utils.$('#bidAmount').placeholder = Utils.formatCurrency(minBid);

    // Watch Button Setup
    if (Auth.isLoggedIn()) {
        setupWatchButton(auction.id);
    }
  }

  // State for Watchlist
  let isWatched = false;

  async function setupWatchButton(auctionId) {
      // 1. Create Button Element if not exists (or hook into existing)
      const titleEl = Utils.$('#auctionTitle');
      if (!titleEl) return;

      // Check if button already exists
      let btnWatch = document.getElementById('btnWatch');
      if (!btnWatch) {
          btnWatch = document.createElement('button');
          btnWatch.id = 'btnWatch';
          btnWatch.className = 'btn btn-icon btn-sm ml-2';
          btnWatch.style.verticalAlign = 'middle';
          btnWatch.title = 'Añadir a Watchlist';
          // Insert after title
          titleEl.appendChild(btnWatch);
      }

      // 2. Fetch Initial State (GET /watchlist)
      // Note: Idealmente el backend nos diría "isWatched" en el getById del auction.
      // Como v0.2.3 no lo incluye, debemos fetchear la lista completa.
      try {
          // Disable while checking
          btnWatch.disabled = true;
          btnWatch.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>';

          const response = await fetch('/api/v1/watchlist');
          if (response.ok) {
              const list = await response.json();
              if (list && Array.isArray(list)) {
                   const found = list.find(item => item.auctionId === auctionId);
                   isWatched = !!found;
                   updateWatchButtonUI(btnWatch);
              }
          }
      } catch (e) {
          console.error('Error checking watchlist status', e);
      } finally {
          btnWatch.disabled = false;
          // Add click listener
          btnWatch.onclick = () => toggleWatchlist(auctionId, btnWatch);
      }
  }

  function updateWatchButtonUI(btn) {
      if (isWatched) {
          btn.innerHTML = '<span class="material-symbols-outlined text-error">favorite</span>';
          btn.title = 'Eliminar de Watchlist';
      } else {
          btn.innerHTML = '<span class="material-symbols-outlined">favorite_border</span>';
          btn.title = 'Añadir a Watchlist';
      }
  }

  async function toggleWatchlist(auctionId, btn) {
      btn.disabled = true;
      try {
          if (isWatched) {
              // DELETE
              const res = await fetch(`/api/v1/watchlist/${auctionId}`, { method: 'DELETE' });
              if (!res.ok) throw new Error('Delete failed');
              isWatched = false;
              Utils.toast('Eliminado de watchlist', 'success');
          } else {
              // POST
              const res = await fetch(`/api/v1/watchlist`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ auctionId }) 
              });
              if (!res.ok) throw new Error('Add failed');
              isWatched = true; // Only update on success
              Utils.toast('Añadido a watchlist', 'success');
          }
          updateWatchButtonUI(btn);
      } catch (error) {
          console.error(error);
          Utils.toast('Error al actualizar watchlist', 'error');
      } finally {
          btn.disabled = false;
      }
  }

  /**
   * Render images
   */
  function renderImages() {
    const images = auction.images || [];
    const mainImage = Utils.$('#mainImage img');
    const thumbnailsContainer = Utils.$('#thumbnails');

    if (images.length > 0) {
      mainImage.src = images[0];
      mainImage.alt = auction.title;

      if (images.length > 1) {
        thumbnailsContainer.innerHTML = images.map((img, index) => `
          <div class="auction-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${img}" alt="Imagen ${index + 1}">
          </div>
        `).join('');

        // Thumbnail click handler
        thumbnailsContainer.querySelectorAll('.auction-thumbnail').forEach(thumb => {
          thumb.addEventListener('click', () => {
            const index = parseInt(thumb.dataset.index);
            mainImage.src = images[index];
            
            thumbnailsContainer.querySelectorAll('.auction-thumbnail').forEach(t => {
              t.classList.remove('active');
            });
            thumb.classList.add('active');
          });
        });
      }
    } else {
      mainImage.src = 'https://via.placeholder.com/800x600?text=Sin+imagen';
    }
  }

  /**
   * Setup bid suggestions
   */
  function setupBidSuggestions(currentPrice) {
    const container = Utils.$('#bidSuggestions');
    if (!container) return;

    const suggestions = [
      currentPrice + 5,
      currentPrice + 10,
      currentPrice + 25,
      currentPrice + 50,
    ];

    container.innerHTML = suggestions.map(amount => `
      <button type="button" class="bid-suggestion" data-amount="${amount}">
        ${Utils.formatCurrency(amount)}
      </button>
    `).join('');

    container.querySelectorAll('.bid-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.$('#bidAmount').value = btn.dataset.amount;
      });
    });
  }

  /**
   * Load bid history
   */
  async function loadBidHistory() {
    const container = Utils.$('#bidHistory');
    if (!container) return;

    try {
      const bids = await Api.auctions.getBids(auction.id);

      if (!bids || bids.length === 0) {
        container.innerHTML = `
          <p class="text-secondary text-center">No hay pujas aún. ¡Sé el primero!</p>
        `;
        return;
      }

      container.innerHTML = bids.slice(0, 10).map((bid, index) => `
        <div class="bid-item">
          <div class="bid-item-user">
            <div class="sidebar-user-avatar" style="width: 32px; height: 32px; font-size: 14px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">person</span>
            </div>
            <div>
              <p class="font-medium">${bid.bidder?.username || 'Usuario'}</p>
              <p class="bid-item-time">${Utils.formatRelativeTime(bid.createdAt)}</p>
            </div>
          </div>
          <div class="bid-item-amount ${index === 0 ? 'text-primary' : ''}">${Utils.formatCurrency(bid.amount)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load bids:', error);
      container.innerHTML = `
        <p class="text-error text-center">Error al cargar las pujas</p>
      `;
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    const placeBidBtn = Utils.$('#btnPlaceBid');
    if (placeBidBtn) {
      placeBidBtn.addEventListener('click', handlePlaceBid);
    }

    // Enter key on bid input
    Utils.$('#bidAmount')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handlePlaceBid();
      }
    });
  }

  /**
   * Handle place bid
   */
  async function handlePlaceBid() {
    if (!Auth.isLoggedIn()) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?return=${returnUrl}`;
      return;
    }

    const amountInput = Utils.$('#bidAmount');
    const amount = parseFloat(amountInput.value);
    const btn = Utils.$('#btnPlaceBid');

    const currentPrice = auction.currentPrice || auction.startingPrice;
    const minBid = currentPrice + 1;

    if (!amount || amount < minBid) {
      Utils.toast(`La puja mínima es ${Utils.formatCurrency(minBid)}`, 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Pujando...';

    try {
      await Api.auctions.placeBid(auction.id, amount);
      
      Utils.toast('¡Puja realizada exitosamente!', 'success');
      
      // Reload auction data
      auction = await Api.auctions.getById(auction.id);
      renderAuction();
      loadBidHistory();
      
      amountInput.value = '';
    } catch (error) {
      console.error('Bid failed:', error);
      
      // Check for Insufficient Balance
      // Assuming Backend returns 400/402 or message contains specific text
      // We check multiple possibilities strictly
      const msg = error.message?.toLowerCase() || '';
      if (error.statusCode === 402 || msg.includes('balance') || msg.includes('saldo') || msg.includes('funds')) {
          Utils.toast('Saldo insuficiente. Redirigiendo a depósito...', 'warning');
          setTimeout(() => {
              const returnUrl = encodeURIComponent(window.location.pathname);
              window.location.href = `/wallet/deposit?return=${returnUrl}`;
          }, 1500);
          return;
      }

      Utils.toast(error.message || 'Error al realizar la puja', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Pujar';
    }
  }

  /**
   * Start countdown timer
   */
  function startCountdown() {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  /**
   * Update countdown display
   */
  function updateCountdown() {
    const timeLeftEl = Utils.$('#timeLeft');
    if (!timeLeftEl || !auction) return;

    const now = new Date();
    const end = new Date(auction.endsAt);
    const diff = end - now;

    if (diff <= 0) {
      timeLeftEl.textContent = 'Finalizada';
      timeLeftEl.style.color = 'var(--text-secondary)';
      clearInterval(countdownInterval);
      
      // Hide bid form
      Utils.hide('#bidForm');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      timeLeftEl.textContent = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      timeLeftEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      timeLeftEl.textContent = `${minutes}m ${seconds}s`;
      timeLeftEl.style.color = 'var(--color-error)';
    }
  }

  /**
   * Get status text
   */
  function getStatusText(status) {
    const texts = {
      'DRAFT': 'Borrador',
      'PUBLISHED': 'Publicada',
      'ACTIVE': 'Activa',
      'CLOSED': 'Finalizada',
      'CANCELLED': 'Cancelada',
    };
    return texts[status] || status;
  }
})();
