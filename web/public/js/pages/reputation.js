/**
 * Iron Loot - Reputation View
 * Fetches data from /api/users/me (profile) and /api/users/{id}/ratings
 */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        loadReputation();
    });

    async function loadReputation() {
        const userScoreEl = Utils.$('#userScore');
        const starsContainer = Utils.$('#starsContainer');
        const totalRatingsEl = Utils.$('#totalRatings');
        const listContainer = Utils.$('#ratingsList');

        try {
            // 1. Get current user ID
            const profileRes = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${Utils.getToken()}` }
            });
            if (!profileRes.ok) throw new Error('Failed to load profile');
            const user = await profileRes.json();

            // 2. Fetch ratings for this user
            const ratingsRes = await fetch(`/api/users/${user.id}/ratings`, {
                headers: { 'Authorization': `Bearer ${Utils.getToken()}` }
            });
            
            if (!ratingsRes.ok) throw new Error('Failed to fetch ratings');
            const ratings = await ratingsRes.json();

            // 3. Calculate Stats
            const total = ratings.length;
            const avg = total > 0 
                ? (ratings.reduce((acc, r) => acc + r.score, 0) / total).toFixed(1)
                : '0.0';

            // 4. Render Header
            userScoreEl.textContent = avg;
            totalRatingsEl.textContent = `${total} reseña${total !== 1 ? 's' : ''}`;
            starsContainer.innerHTML = renderStars(parseFloat(avg));

            // 5. Render List
            if (total === 0) {
                listContainer.innerHTML = `<p class="text-center text-secondary">Aún no tienes reseñas.</p>`;
                return;
            }

            listContainer.innerHTML = ratings.map(r => `
                <div class="card mb-3" style="margin-bottom: var(--spacing-4);">
                    <div class="card-body">
                        <div class="flex justify-between mb-2">
                            <span class="font-bold text-sm">Transacción #${r.transactionId?.substring(0,8) || 'N/A'}</span>
                            <span class="text-secondary text-sm">${Utils.formatRelativeTime(r.createdAt)}</span>
                        </div>
                        <div class="text-warning mb-2" style="font-size: 0.9rem;">
                            ${renderStars(r.score)}
                        </div>
                        <p>${r.comment || 'Sin comentario.'}</p>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load reputation:', error);
            listContainer.innerHTML = `<p class="text-center text-error">Error al cargar la reputación.</p>`;
        }
    }

    function renderStars(score) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= score) html += '★';
            else html += '☆';
        }
        return html;
    }

})();
