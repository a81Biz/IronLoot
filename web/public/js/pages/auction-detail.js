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
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    try {
      // Use AuctionFlow to load detail + bids + watchlist status
      const { auction: auctionData, bids: bidsData, isWatched: watchedStatus } = await AuctionFlow.viewAuctionDetail(auctionId);
      
      auction = auctionData;
      // Store initial bids/watch status if needed or just render
      renderAuction();
      renderBids(bidsData); // function renamed/created
      
      if (AuthState.isLoggedIn()) {
          setupWatchButton(auction.id, watchedStatus);
      }

      setupEventListeners();
      startCountdown();
    } catch (error) {
      console.error('Failed to load auction:', error);
      const msg = error.message || error.toString();
      Utils.$('#auctionTitle').textContent = `Error: ${msg}`;
      // Also log to toast
      Utils.toast(`Error al cargar: ${msg}`, 'error');
    }
  }

  function setupEventListeners() {
      const btnPlaceBid = Utils.$('#btnPlaceBid');
      if (btnPlaceBid) {
          btnPlaceBid.onclick = handlePlaceBid;
      }
      
      // Also allow Enter key in amount input
      const amountInput = Utils.$('#bidAmount');
      if (amountInput) {
          amountInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                  handlePlaceBid();
              }
          });
      }
  }

  /**
   * Render auction details
   */
  function renderAuction() {
      if (!auction) return;

      // Basic Info
      Utils.text('#auctionTitle', auction.title);
      Utils.text('#auctionDescription', auction.description);
      Utils.text('#currentPrice', Utils.formatCurrency(auction.currentPrice));
      
      // Images
      const img = auction.images && auction.images.length > 0 ? auction.images[0] : 'https://via.placeholder.com/800x600?text=Sin+Imagen';
      const imgEl = Utils.$('#auctionImage');
      if (imgEl) imgEl.src = img;

      // Status & Times
      Utils.text('#statusBadge', getStatusText(auction.status));
      const statusEl = Utils.$('#statusBadge');
      if (statusEl) {
           statusEl.className = `badge badge-${auction.status.toLowerCase()}`;
      }
      
      Utils.text('#startingPrice', Utils.formatCurrency(auction.startingPrice));
      Utils.text('#startDate', Utils.formatDate(auction.startsAt));
      Utils.text('#endDate', Utils.formatDate(auction.endsAt));

      // Seller Info
      if (auction.seller) {
          Utils.text('#sellerName', auction.seller.username || 'Vendedor');
          Utils.text('#sellerRating', auction.seller.rating ? `${auction.seller.rating} ★` : 'N/A');
      }

      // Bid Form State
      const bidForm = Utils.$('#bidForm');
      if (bidForm) {
          if (auction.status === 'ACTIVE') {
              bidForm.style.display = 'block';
              const minBid = (parseFloat(auction.currentPrice) || 0) + 1;
              Utils.$('#bidAmount').placeholder = `Mínimo ${Utils.formatCurrency(minBid)}`;
              Utils.$('#bidAmount').min = minBid;
          } else {
              bidForm.style.display = 'none';
          }
      }
  }

  async function setupWatchButton(auctionId, initialStatus) {
      const titleEl = Utils.$('#auctionTitle');
      if (!titleEl) return;

      let btnWatch = document.getElementById('btnWatch');
      if (!btnWatch) {
          btnWatch = document.createElement('button');
          btnWatch.id = 'btnWatch';
          btnWatch.className = 'btn btn-icon btn-sm ml-2';
          btnWatch.style.verticalAlign = 'middle';
          titleEl.appendChild(btnWatch);
      }

      // Local state sync
      isWatched = initialStatus;
      updateWatchButtonUI(btnWatch);

      btnWatch.onclick = () => toggleWatchlist(auctionId, btnWatch);
  }

  async function toggleWatchlist(auctionId, btn) {
      btn.disabled = true;
      try {
          await WatchlistFlow.toggle({ auctionId });
          // Flow emits event, but we can also flip local state for immediate feedback if Flow doesn't return new state
          isWatched = !isWatched; // Optimistic flip or assume Flow success toggles it
          updateWatchButtonUI(btn);
          Utils.toast(isWatched ? 'Añadido a watchlist' : 'Eliminado de watchlist', 'success');
      } catch (error) {
          console.error(error);
          Utils.toast('Error al actualizar watchlist', 'error');
      } finally {
          btn.disabled = false;
      }
  }

  // ...

  async function loadBidHistory() {
     // Re-using AuctionFlow or Service? 
     // Spec 10 says `viewAuctionDetail` returns bids.
     // But `handlePlaceBid` reloads.
     // Let's make a specific reload function using Service or Flow.
     try {
         const bids = await AuctionService.getBids(auction.id);
         renderBids(bids);
     } catch (e) {
         console.error(e);
     }
  }

  function renderBids(bids) {
    const container = Utils.$('#bidHistory');
    if (!container) return;
    
    if (!bids || bids.length === 0) {
        container.innerHTML = `<p class="text-secondary text-center">No hay pujas aún. ¡Sé el primero!</p>`;
        return;
    }
    // ... (rest of render logic same as before) ...
    container.innerHTML = bids.slice(0, 10).map((bid, index) => `
        <div class="bid-item">
          <div class="bid-item-user">
            <div class="sidebar-user-avatar" style="width: 32px; height: 32px; font-size: 14px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">person</span>
            </div>
            <div>
              <p class="font-medium">${Utils.escapeHtml(bid.bidder?.username || 'Usuario')}</p>
              <p class="bid-item-time">${Utils.formatRelativeTime(bid.createdAt)}</p>
            </div>
          </div>
          <div class="bid-item-amount ${index === 0 ? 'text-primary' : ''}">${Utils.formatCurrency(bid.amount)}</div>
        </div>
      `).join('');
  }

  // ...

  async function handlePlaceBid() {
    if (!AuthState.isLoggedIn()) {
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
      // Use BidFlow
      await BidFlow.placeBid({ auctionId: auction.id, amount });
      
      Utils.toast('¡Puja realizada exitosamente!', 'success');
      
      // Reload Data
      const { auction: updatedAuction, bids } = await AuctionFlow.viewAuctionDetail(auction.id);
      auction = updatedAuction;
      renderAuction();
      renderBids(bids);
      
      amountInput.value = '';
    } catch (error) {
      console.error('Bid failed:', error);
      const msg = error.message?.toLowerCase() || '';
      if (error.statusCode === 402 || msg.includes('balance') || msg.includes('saldo')) {
           Utils.toast('Saldo insuficiente. Redirigiendo...', 'warning');
           setTimeout(() => window.location.href = '/wallet/deposit', 1500);
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
