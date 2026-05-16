(() => {
	const appShell = document.querySelector('.app-shell');
	const form = document.querySelector('[data-filter-form]');
	const grid = document.querySelector('[data-vehicle-grid]');
	const totalCount = document.querySelector('[data-total-count]');
	const emptyState = document.querySelector('[data-empty-state]');
	const pagination = document.querySelector('[data-pagination]');
	const sortSelect = document.querySelector('[data-sort]');
	const filterToggle = document.querySelector('[data-filter-toggle]');
	const logoutButton = document.querySelector('[data-logout]');
	const timeNode = document.querySelector('[data-current-time]');

	const state = {
		page: 1,
		cars: [],
		favourites: new Set(),
		total: 0,
		lastPage: 1,
		sort: 'newest',
		isLoading: false,
		carsController: null,
	};

	function updateClock() {
		if (!timeNode) {
			return;
		}

		timeNode.textContent = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short',
		}).format(new Date());
	}

	function normalizeCategory(value = '') {
		const category = value.toLowerCase();
		if (category === 'suv') {
			return 'SUV';
		}
		return category ? category[0].toUpperCase() + category.slice(1) : 'Vehicle';
	}

	function escapeHtml(value = '') {
		return String(value).replace(/[&<>"']/g, (char) => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		})[char]);
	}

	function buildParams() {
		const data = new FormData(form);
		const params = {
			page: state.page,
			category: data.get('category') || '',
			seats: data.get('seats') || '',
			transmission: data.get('transmission') || '',
			min_price: data.get('min_price') || '',
			max_price: data.get('max_price') || '',
		};

		params.status = data.get('status') ? 'available' : 'all';

		return params;
	}

	function clientFilter(cars) {
		const search = new FormData(form).get('search')?.toString().trim().toLowerCase();
		if (!search) {
			return cars;
		}

		return cars.filter((car) => `${car.brand} ${car.model} ${car.category}`.toLowerCase().includes(search));
	}

	function clientSort(cars) {
		const sorted = [...cars];
		const sort = state.sort;

		if (sort === 'price_asc') {
			sorted.sort((a, b) => Number(a.daily_rate) - Number(b.daily_rate));
		}
		if (sort === 'price_desc') {
			sorted.sort((a, b) => Number(b.daily_rate) - Number(a.daily_rate));
		}
		if (sort === 'rating') {
			sorted.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0));
		}

		return sorted;
	}

	function carImage(car) {
		const imageUrl = window.API.resolveUrl(car.image_url);
		if (imageUrl) {
			return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${car.brand} ${car.model}`)}" loading="lazy" />`;
		}

		return '<div class="vehicle-fallback" aria-hidden="true"></div>';
	}

	function renderSkeletons() {
		grid.innerHTML = Array.from({ length: 6 }, () => `
			<article class="vehicle-card skeleton-card">
				<div class="vehicle-media"></div>
				<div class="vehicle-body">
					<div class="skeleton-line short"></div>
					<div class="vehicle-title-row">
						<div class="skeleton-line"></div>
						<div class="skeleton-line price"></div>
					</div>
				</div>
			</article>
		`).join('');
	}

	function renderCars() {
		const cars = clientSort(clientFilter(state.cars));
		totalCount.textContent = state.total;
		emptyState.hidden = cars.length > 0;

		grid.innerHTML = cars.map((car) => {
			const name = `${car.brand} ${car.model}`;
			const safeName = escapeHtml(name);
			const subtitle = `${car.year} ${normalizeCategory(car.category)} · ${car.transmission || 'auto'} · ${car.status}`;
			const isFavourite = state.favourites.has(Number(car.id));
			const rating = Number(car.average_rating || 0);
			const reviews = Number(car.review_count || 0);
			const unavailable = car.status !== 'available';
			const reserveHref = unavailable ? `./car-detail.html?id=${car.id}` : `./car-detail.html?id=${car.id}&book=1`;
			const reserveText = unavailable ? 'Join waitlist' : 'Reserve';

			return `
				<article class="vehicle-card fade-up-soft">
					<a class="vehicle-media" href="./car-detail.html?id=${car.id}" aria-label="View ${safeName}">
						${carImage(car)}
						<span class="vehicle-seat-chip">${car.seats || 4} seats</span>
						<span class="vehicle-status-chip ${escapeHtml(car.status)}">${escapeHtml(car.status)}</span>
					</a>
					<div class="vehicle-body">
						<div class="vehicle-title-row">
							<div>
								<h2>${safeName}</h2>
								<p class="vehicle-subtitle">${escapeHtml(subtitle)}</p>
							</div>
							<div class="vehicle-price">${window.UIUtils.formatMoney(car.daily_rate)} <span>/ day</span></div>
						</div>
						<div class="vehicle-card-meta">
							<span class="rating">★ ${rating.toFixed(1)} (${reviews})</span>
							<button class="favourite-button ${isFavourite ? 'active' : ''}" type="button" data-favourite="${car.id}" aria-label="${isFavourite ? 'Remove from' : 'Add to'} favourites">
								<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.6a5.5 5.5 0 0 0-9.1-3.9L12 5l.3-.3a5.5 5.5 0 0 1 7.8 7.8L12 20.5l-8.1-8a5.5 5.5 0 0 1 7.8-7.8L12 5"></path></svg>
							</button>
						</div>
						<div class="vehicle-actions">
							<a class="btn-secondary" href="./car-detail.html?id=${car.id}">View details</a>
							<a class="btn-quiet" href="${reserveHref}">${reserveText}</a>
						</div>
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

	async function loadFavourites() {
		try {
			const response = await window.API.favourites();
			state.favourites = new Set((response.data || []).map((car) => Number(car.id)));
		} catch {
			state.favourites = new Set();
		}
	}

	async function loadCars() {
		// Prevent concurrent requests: abort previous if still in flight
		if (state.carsController) {
			state.carsController.abort();
		}

		// Guard: don't start new request if already loading
		if (state.isLoading) {
			return;
		}

		state.isLoading = true;
		state.carsController = new AbortController();

		renderSkeletons();
		emptyState.hidden = true;

		try {
			const response = await fetch(window.API.baseUrl + '/cars?' + new URLSearchParams(buildParams()).toString(), {
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				signal: state.carsController.signal,
			});

			if (!response.ok) {
				throw new Error(`Request failed (${response.status})`);
			}

			const payload = await response.json();
			if (!payload.success) {
				throw new Error(payload.message || 'Failed to load cars');
			}

			const data = payload.data;
			state.cars = data.data || [];
			state.total = Math.max(Number(data.total || 0), state.cars.length);
			state.lastPage = Math.max(Number(data.last_page || 1), Math.ceil(state.total / Number(data.per_page || 12)));
			renderCars();
			renderPagination();
		} catch (error) {
			// Ignore abort errors (user cancelled the request)
			if (error.name === 'AbortError') {
				return;
			}

			grid.innerHTML = '';
			emptyState.hidden = false;
			emptyState.querySelector('h2').textContent = 'Unable to load vehicles';
			emptyState.querySelector('p').textContent = error.message || 'Please try again.';
			totalCount.textContent = '0';
		} finally {
			state.isLoading = false;
		}
	}

	async function requireCustomerSession() {
		try {
			const response = await window.API.me();
			window.AppState?.setUser(response.data);
		} catch {
			window.AppState?.clearUser();
			window.location.replace('../auth/login.html');
		}
	}

	async function toggleFavourite(carId, button) {
		const numericId = Number(carId);
		const shouldRemove = state.favourites.has(numericId);
		button.disabled = true;

		try {
			if (shouldRemove) {
				await window.API.removeFavourite(carId);
				state.favourites.delete(numericId);
			} else {
				await window.API.addFavourite(carId);
				state.favourites.add(numericId);
			}
			renderCars();
		} catch (error) {
			window.UIUtils?.toast(error.message || 'Could not update favourites.', 'error');
		} finally {
			button.disabled = false;
		}
	}

	function bindEvents() {
		let filterTimer = 0;

		// Listen to 'change' events for form controls (selects, radios, checkboxes)
		// and 'input' event ONLY for text search with debounce
		form.addEventListener('input', (event) => {
			// Only debounce the search input, not other form fields
			if (event.target.name !== 'search') {
				return;
			}
			
			clearTimeout(filterTimer);
			filterTimer = setTimeout(() => {
				state.page = 1;
				loadCars();
			}, 220);
		});

		// Handle all other filter changes (selects, radio buttons, checkboxes)
		form.addEventListener('change', () => {
			clearTimeout(filterTimer); // Cancel any pending debounced search
			state.page = 1;
			loadCars();
		});

		form.addEventListener('reset', () => {
			clearTimeout(filterTimer);
			setTimeout(() => {
				state.page = 1;
				loadCars();
			});
		});

		sortSelect.addEventListener('change', () => {
			state.sort = sortSelect.value;
			renderCars();
		});

		grid.addEventListener('click', (event) => {
			const button = event.target.closest('[data-favourite]');
			if (!button) {
				return;
			}
			toggleFavourite(button.dataset.favourite, button);
		});

		pagination.addEventListener('click', (event) => {
			const button = event.target.closest('[data-page]');
			if (!button) {
				return;
			}
			state.page = Number(button.dataset.page);
			loadCars();
		});

		filterToggle?.addEventListener('click', () => {
			appShell.classList.toggle('filters-open');
		});

		logoutButton?.addEventListener('click', async () => {
			try {
				await window.API.logout();
			} finally {
				window.AppState?.clearUser();
				window.location.replace('../auth/login.html');
			}
		});
	}

	async function init() {
		updateClock();
		setInterval(updateClock, 30000);
		bindEvents();
		await requireCustomerSession();
		await loadFavourites();
		await loadCars();
	}

	init();
})();
