(() => {
    const list = document.querySelector('[data-booking-list]');
    const emptyState = document.querySelector('[data-empty-state]');
    const pagination = document.querySelector('[data-pagination]');
    const tabButtons = Array.from(document.querySelectorAll('[data-filter]'));
    const logoutButton = document.querySelector('[data-logout]');
    const stats = {
        total: document.querySelector('[data-stat-total]'),
        active: document.querySelector('[data-stat-active]'),
        upcoming: document.querySelector('[data-stat-upcoming]'),
        spent: document.querySelector('[data-stat-spent]'),
    };

    const state = {
        page: 1,
        filter: 'all',
        bookings: [],
        total: 0,
        lastPage: 1,
        // FIX 3: track aggregated stats across all pages separately
        allTimeSpent: 0,
        allTimeTotal: 0,
        allTimeActive: 0,
        allTimeUpcoming: 0,
    };

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        })[char]);
    }

    function daysBetween(start, end) {
        return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
    }

    function shortDate(value) {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(`${value}T00:00:00`));
    }

    function categoryLabel(value = '') {
        const normalized = value.toLowerCase();
        return normalized === 'suv'
            ? 'SUV'
            : normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function bookingMatchesFilter(booking) {
        if (state.filter === 'all') {
            return true;
        }
        if (state.filter === 'upcoming') {
            return ['pending', 'confirmed'].includes(booking.status);
        }
        return booking.status === state.filter;
    }

    function imageMarkup(booking) {
        const imageUrl = window.API.resolveUrl(booking.image_url);
        if (imageUrl) {
            return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${booking.brand} ${booking.model}`)}" />`;
        }
        return '<div class="detail-fallback-car" aria-hidden="true"></div>';
    }

    function renderSkeletons() {
        list.innerHTML = Array.from({ length: 3 }, () => `
            <article class="booking-card-row">
                <div class="booking-card-main">
                    <div class="booking-thumb skeleton-line"></div>
                    <div class="booking-info">
                        <div class="skeleton-line short"></div>
                        <div class="skeleton-line"></div>
                    </div>
                </div>
            </article>
        `).join('');
    }

    function renderStats() {
        // FIX 3: use the aggregated values stored on state rather than
        // deriving counts from the current page slice alone.
        stats.total.textContent = state.allTimeTotal;
        stats.active.textContent = state.allTimeActive;
        stats.upcoming.textContent = state.allTimeUpcoming;
        stats.spent.textContent = window.UIUtils.formatMoney(state.allTimeSpent);
    }

    function statusText(status) {
        if (status === 'active') {
            return 'Active now';
        }
        return categoryLabel(status);
    }

    // FIX 1: closed the function properly and moved `return ''` inside the function
    function actionsFor(booking) {
        const canCancel = ['pending', 'confirmed'].includes(booking.status);
        const canExtend = booking.status === 'active';
        const canReview = booking.status === 'completed';

        if (canExtend) {
            return `<a class="btn-quiet" href="./extend-booking.html?booking_id=${booking.id}">Extend</a>`;
        }

        if (canCancel) {
            return `
                <button class="btn-quiet" type="button" data-cancel="${booking.id}">Cancel</button>
                <a class="btn-secondary" href="./car-detail.html?id=${booking.car_id}&book=1">Modify</a>
            `;
        }

        if (canReview) {
            return `<a class="btn-quiet" href="./review.html?booking_id=${booking.id}">Leave review</a>`;
        }

        // FIX 4: was unreachable inside the canReview block; now reachable as default
        return '';
    } // FIX 1: this closing brace was missing, causing actionsFor to swallow renderBookings

    function renderBookings() {
        const visible = state.bookings.filter(bookingMatchesFilter);
        emptyState.hidden = visible.length > 0;

        list.innerHTML = visible.map((booking) => {
            const carName = `${booking.brand} ${booking.model}`;
            const duration = daysBetween(booking.start_date, booking.end_date);

            return `
                <article class="booking-card-row fade-up-soft">
                    <div class="booking-card-main">
                        <a class="booking-thumb" href="./car-detail.html?id=${booking.car_id}" aria-label="View ${escapeHtml(carName)}">
                            ${imageMarkup(booking)}
                        </a>
                        <div class="booking-info">
                            <h2>${escapeHtml(carName)}</h2>
                            <p>${escapeHtml(`${booking.year || ''} ${categoryLabel(booking.category || '')} · ${categoryLabel(booking.transmission || 'auto')}`)}</p>
                            <div class="booking-date-line">
                                <span>${shortDate(booking.start_date)}</span>
                                <span>→</span>
                                <span>${shortDate(booking.end_date)}</span>
                                <span class="duration-chip">${duration}d</span>
                            </div>
                            <div class="booking-reference">${escapeHtml(booking.reference_number)}</div>
                        </div>
                    </div>
                    <div class="booking-side">
                        <span class="booking-status ${escapeHtml(booking.status)}">• ${statusText(booking.status)}</span>
                    </div>
                    <div class="booking-card-bottom">
                        <div class="booking-total-text">${window.UIUtils.formatMoney(booking.final_total)} <span>total</span></div>
                        <div class="booking-actions">${actionsFor(booking)}</div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderPagination() {
        if (state.lastPage <= 1) {
            pagination.innerHTML = '';
            return;
        }

        pagination.innerHTML = Array.from({ length: state.lastPage }, (_, index) => {
            const page = index + 1;
            return `<button type="button" class="${page === state.page ? 'active' : ''}" data-page="${page}">${page}</button>`;
        }).join('');
    }

    async function loadBookings() {
        renderSkeletons();
        emptyState.hidden = true;

        try {
            const response = await window.API.myBookings({ page: state.page });
            const payload = response.data;

            state.bookings = payload.data || [];
            state.total = Number(payload.total || state.bookings.length);
            state.lastPage = Number(payload.last_page || 1);

            // FIX 3: use API-provided aggregate stats when available, otherwise
            // derive from the current page as a best-effort fallback.
            if (payload.stats) {
                state.allTimeTotal    = Number(payload.stats.total    ?? state.total);
                state.allTimeActive   = Number(payload.stats.active   ?? 0);
                state.allTimeUpcoming = Number(payload.stats.upcoming ?? 0);
                state.allTimeSpent    = Number(payload.stats.spent    ?? 0);
            } else {
                // Fallback: compute from the current page slice only
                // (may be inaccurate on pages > 1 — request aggregate stats from the API).
                state.allTimeTotal    = state.total;
                state.allTimeActive   = state.bookings.filter((b) => b.status === 'active').length;
                state.allTimeUpcoming = state.bookings.filter((b) => ['pending', 'confirmed'].includes(b.status)).length;
                state.allTimeSpent    = state.bookings
                    .filter((b) => b.status === 'completed')
                    .reduce((sum, b) => sum + Number(b.final_total || 0), 0);
            }

            renderStats();
            renderBookings();
            renderPagination();
        } catch (error) {
            if (error.message?.includes('Unauthenticated')) {
                window.location.replace('../auth/login.html');
                return;
            }

            list.innerHTML = '';
            emptyState.hidden = false;
            emptyState.querySelector('h2').textContent = 'Unable to load bookings';
            emptyState.querySelector('p').textContent = error.message || 'Please try again.';
        }
    }

    function bindEvents() {
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                state.filter = button.dataset.filter;
                tabButtons.forEach((item) => item.classList.toggle('active', item === button));
                renderBookings();
            });
        });

        list.addEventListener('click', async (event) => {
            const cancelButton = event.target.closest('[data-cancel]');

            if (cancelButton) {
                const confirmed = await window.UIUtils?.ask('Cancel this booking?', {
                    title: 'Cancel booking',
                    confirmText: 'Cancel booking',
                });
                if (!confirmed) {
                    return;
                }
                cancelButton.disabled = true;
                try {
                    await window.API.cancelBooking(cancelButton.dataset.cancel);
                    await loadBookings();
                } catch (error) {
                    window.UIUtils?.toast(error.message || 'Unable to cancel booking.', 'error');
                    cancelButton.disabled = false;
                }
            }

        });

        pagination.addEventListener('click', (event) => {
            const button = event.target.closest('[data-page]');
            if (!button) {
                return;
            }
            state.page = Number(button.dataset.page);
            loadBookings();
        });

        logoutButton.addEventListener('click', async () => {
            try {
                await window.API.logout();
            } finally {
                window.AppState?.clearUser();
                window.location.replace('../auth/login.html');
            }
        });
    }

    async function init() {
        try {
            const me = await window.API.me();
            window.AppState?.setUser(me.data);
        } catch {
            window.location.replace('../auth/login.html');
            return;
        }
        bindEvents();
        loadBookings();
    }

    init();
})();
