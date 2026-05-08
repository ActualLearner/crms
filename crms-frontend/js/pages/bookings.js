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
		return normalized === 'suv' ? 'SUV' : normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
		const bookings = state.bookings;
		const active = bookings.filter((booking) => booking.status === 'active').length;
		const upcoming = bookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status)).length;
		const spent = bookings
			.filter((booking) => booking.status === 'completed')
			.reduce((sum, booking) => sum + Number(booking.final_total || 0), 0);

		stats.total.textContent = bookings.length;
		stats.active.textContent = active;
		stats.upcoming.textContent = upcoming;
		stats.spent.textContent = window.UIUtils.formatMoney(spent);
	}

	function statusText(status) {
		if (status === 'active') {
			return 'Active now';
		}
		return categoryLabel(status);
	}

	function actionsFor(booking) {
		const canCancel = ['pending', 'confirmed'].includes(booking.status);
		const canExtend = booking.status === 'active';
		const canReview = booking.status === 'completed';

		if (canExtend) {
			return `
				<div class="extend-inline">
					<input type="date" data-extend-date="${booking.id}" min="${booking.end_date}" aria-label="New return date" />
					<button class="btn-quiet" type="button" data-extend="${booking.id}">Extend</button>
				</div>
			`;
		}

		if (canCancel) {
			return `
				<button class="btn-quiet" type="button" data-cancel="${booking.id}">Cancel</button>
				<a class="btn-secondary" href="./car-detail.html?id=${booking.car_id}&book=1">Modify</a>
			`;
		}

		if (canReview) {
			return `<a class="btn-quiet" href="./car-detail.html?id=${booking.car_id}">Leave review</a>`;
		}

		return '';
	}

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
			const extendButton = event.target.closest('[data-extend]');

			if (cancelButton) {
				if (!window.confirm('Cancel this booking?')) {
					return;
				}
				cancelButton.disabled = true;
				try {
					await window.API.cancelBooking(cancelButton.dataset.cancel);
					await loadBookings();
				} catch (error) {
					window.alert(error.message || 'Unable to cancel booking.');
					cancelButton.disabled = false;
				}
			}

			if (extendButton) {
				const dateInput = document.querySelector(`[data-extend-date="${extendButton.dataset.extend}"]`);
				if (!dateInput?.value) {
					window.alert('Choose a new return date first.');
					return;
				}
				extendButton.disabled = true;
				try {
					await window.API.extendBooking(extendButton.dataset.extend, dateInput.value);
					await loadBookings();
				} catch (error) {
					window.alert(error.message || 'Unable to extend booking.');
					extendButton.disabled = false;
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
