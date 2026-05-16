(() => {
	const grid = document.querySelector('[data-favourites-grid]');
	const countNode = document.querySelector('[data-count]');
	const emptyState = document.querySelector('[data-empty-state]');
	const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
	const sortSelect = document.querySelector('[data-sort]');
	const logoutButton = document.querySelector('[data-logout]');

	const state = {
		cars: [],
		filter: 'all',
		sort: 'recent',
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

	function categoryLabel(value = '') {
		const normalized = value.toLowerCase();
		return normalized === 'suv' ? 'SUV' : normalized.charAt(0).toUpperCase() + normalized.slice(1);
	}

	function horsepower(car) {
		const match = car.description?.match(/(\d+)\s*hp/i);
		return match ? `${match[1]} hp` : '250 hp';
	}

	function filteredCars() {
		let cars = [...state.cars];
		if (state.filter === 'available') {
			cars = cars.filter((car) => car.status === 'available');
		} else if (state.filter !== 'all') {
			cars = cars.filter((car) => car.category?.toLowerCase() === state.filter);
		}

		if (state.sort === 'price_asc') {
			cars.sort((a, b) => Number(a.daily_rate) - Number(b.daily_rate));
		}
		if (state.sort === 'price_desc') {
			cars.sort((a, b) => Number(b.daily_rate) - Number(a.daily_rate));
		}
		if (state.sort === 'rating') {
			cars.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0));
		}

		return cars;
	}

	function imageMarkup(car) {
		const imageUrl = window.API.resolveUrl(car.image_url);
		if (imageUrl) {
			return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${car.brand} ${car.model}`)}" />`;
		}
		return '<div class="detail-fallback-car" aria-hidden="true"></div>';
	}

	function renderSkeletons() {
		grid.innerHTML = Array.from({ length: 6 }, () => `
			<article class="favourite-card">
				<div class="favourite-media skeleton-line"></div>
				<div class="favourite-body">
					<div class="skeleton-line short"></div>
					<div class="skeleton-line"></div>
				</div>
			</article>
		`).join('');
	}

	function render() {
		const cars = filteredCars();
		countNode.textContent = state.cars.length;
		emptyState.hidden = cars.length > 0;

		grid.innerHTML = cars.map((car) => {
			const name = `${car.brand} ${car.model}`;
			const available = car.status === 'available';
			const rating = Number(car.average_rating || 0);
			const reviews = Number(car.review_count || 0);
			return `
				<article class="favourite-card fade-up-soft">
					<div class="favourite-media">
						<span class="availability-badge ${available ? '' : 'unavailable'}">${available ? 'Available' : 'Unavailable'}</span>
						<button class="remove-favourite" type="button" data-remove="${car.id}" aria-label="Remove ${escapeHtml(name)} from favourites">
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.6a5.5 5.5 0 0 0-9.1-3.9L12 5l.3-.3a5.5 5.5 0 0 1 7.8 7.8L12 20.5l-8.1-8a5.5 5.5 0 0 1 7.8-7.8L12 5"></path></svg>
						</button>
						${imageMarkup(car)}
					</div>
					<div class="favourite-body">
						<h2>${escapeHtml(name)}</h2>
						<p>${escapeHtml(`${car.year || ''} ${categoryLabel(car.category || '')} · ${categoryLabel(car.transmission || 'auto')}`)}</p>
						<div class="favourite-price-row">
							<strong>${window.UIUtils.formatMoney(car.daily_rate)} <span>/ day</span></strong>
							<span class="favourite-rating">★ ${rating.toFixed(1)} <span>(${reviews})</span></span>
						</div>
						<div class="favourite-tags">
							<span>${categoryLabel(car.transmission || 'auto')}</span>
							<span>${car.seats || 4} seats</span>
							<span>${horsepower(car)}</span>
						</div>
					</div>
					<div class="favourite-actions">
						<a class="btn-quiet" href="./car-detail.html?id=${car.id}">View details</a>
						${available
							? `<a class="btn-secondary" href="./car-detail.html?id=${car.id}&book=1">Book now</a>`
							: `<button class="btn-secondary" type="button" data-waitlist="${car.id}">Join waitlist</button>`}
					</div>
				</article>
			`;
		}).join('');
	}

	async function loadFavourites() {
		renderSkeletons();
		try {
			const me = await window.API.me();
			window.AppState?.setUser(me.data);
			const response = await window.API.favourites();
			state.cars = response.data || [];
			render();
		} catch (error) {
			if (error.message?.includes('Unauthenticated')) {
				window.location.replace('../auth/login.html');
				return;
			}
			grid.innerHTML = '';
			emptyState.hidden = false;
			emptyState.querySelector('h2').textContent = 'Unable to load favourites';
			emptyState.querySelector('p').textContent = error.message || 'Please try again.';
		}
	}

	function bindEvents() {
		filterButtons.forEach((button) => {
			button.addEventListener('click', () => {
				state.filter = button.dataset.filter;
				filterButtons.forEach((item) => item.classList.toggle('active', item === button));
				render();
			});
		});

		sortSelect.addEventListener('change', () => {
			state.sort = sortSelect.value;
			render();
		});

		grid.addEventListener('click', async (event) => {
			const removeButton = event.target.closest('[data-remove]');
			const waitlistButton = event.target.closest('[data-waitlist]');

			if (removeButton) {
				removeButton.disabled = true;
				try {
					await window.API.removeFavourite(removeButton.dataset.remove);
					state.cars = state.cars.filter((car) => Number(car.id) !== Number(removeButton.dataset.remove));
					render();
				} catch (error) {
					window.UIUtils?.toast(error.message || 'Unable to remove favourite.', 'error');
					removeButton.disabled = false;
				}
			}

			if (waitlistButton) {
				waitlistButton.disabled = true;
				try {
					await window.API.joinWaitlist(waitlistButton.dataset.waitlist);
					waitlistButton.textContent = 'Joined';
				} catch (error) {
					window.UIUtils?.toast(error.message || 'Unable to join waitlist.', 'error');
					waitlistButton.disabled = false;
				}
			}
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

	bindEvents();
	loadFavourites();
})();
