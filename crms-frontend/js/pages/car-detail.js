(() => {
	const params = new URLSearchParams(window.location.search);
	const carId = params.get('id');

	const state = {
		car: null,
		bookedRanges: [],
		favourites: new Set(),
		selectedStart: '',
		selectedEnd: '',
		discount: 0,
		visibleMonth: new Date(),
	};

	const nodes = {
		carName: document.querySelector('[data-car-name]'),
		status: document.querySelector('[data-status]'),
		gallery: document.querySelector('[data-gallery-stage]'),
		favourite: document.querySelector('[data-favourite]'),
		title: document.querySelector('[data-title]'),
		subtitle: document.querySelector('[data-subtitle]'),
		stars: document.querySelector('[data-stars]'),
		rating: document.querySelector('[data-rating]'),
		reviewCount: document.querySelector('[data-review-count]'),
		seats: document.querySelector('[data-seats]'),
		transmission: document.querySelector('[data-transmission]'),
		category: document.querySelector('[data-category]'),
		power: document.querySelector('[data-power]'),
		description: document.querySelector('[data-description]'),
		calendarTitle: document.querySelector('[data-calendar-title]'),
		calendar: document.querySelector('[data-calendar]'),
		reviewTotal: document.querySelector('[data-review-total]'),
		reviews: document.querySelector('[data-reviews]'),
		price: document.querySelector('[data-price]'),
		penalty: document.querySelector('[data-penalty]'),
		form: document.querySelector('[data-booking-form]'),
		promoButton: document.querySelector('[data-apply-promo]'),
		total: document.querySelector('[data-booking-total]'),
		message: document.querySelector('[data-booking-message]'),
		logout: document.querySelector('[data-logout]'),
		prevMonth: document.querySelector('[data-prev-month]'),
		nextMonth: document.querySelector('[data-next-month]'),
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

	function formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function daysBetween(start, end) {
		return Math.max(0, Math.ceil((new Date(end) - new Date(start)) / 86400000));
	}

	function categoryLabel(value = '') {
		const normalized = value.toLowerCase();
		return normalized === 'suv' ? 'SUV' : normalized.charAt(0).toUpperCase() + normalized.slice(1);
	}

	function setMessage(message, type = 'info') {
		nodes.message.textContent = message;
		nodes.message.style.color = type === 'error' ? 'hsl(0 55% 36%)' : 'hsl(220 5% 55%)';
	}

	function renderImage() {
		const imageUrl = window.API.resolveUrl(state.car.image_url);
		nodes.gallery.innerHTML = imageUrl
			? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${state.car.brand} ${state.car.model}`)}" />`
			: '<div class="detail-fallback-car" aria-hidden="true"></div>';
	}

	function renderDetails() {
		const car = state.car;
		const name = `${car.brand} ${car.model}`;
		const rating = Number(car.average_rating || 0);
		const reviewCount = Number(car.review_count || car.reviews?.length || 0);

		document.title = `CRMS - ${name}`;
		nodes.carName.textContent = name;
		nodes.status.textContent = car.status === 'available' ? 'Available' : categoryLabel(car.status);
		nodes.title.textContent = name;
		nodes.subtitle.textContent = `${car.year} ${categoryLabel(car.category)} · ${car.transmission} · ${car.seats} seats`;
		nodes.stars.textContent = '★★★★★';
		nodes.rating.textContent = rating.toFixed(1);
		nodes.reviewCount.textContent = `(${reviewCount} reviews)`;
		nodes.seats.textContent = car.seats || '--';
		nodes.transmission.textContent = categoryLabel(car.transmission || '');
		nodes.category.textContent = categoryLabel(car.category || '');
		nodes.power.textContent = car.description?.match(/(\d+)\s*hp/i)?.[1] ? `${car.description.match(/(\d+)\s*hp/i)[1]} hp` : '250 hp';
		nodes.description.textContent = car.description || `${name} is ready for city errands, airport runs, and longer drives with a comfortable cabin and dependable performance.`;
		nodes.price.textContent = window.UIUtils.formatMoney(car.daily_rate);
		nodes.penalty.textContent = window.UIUtils.formatMoney(car.penalty_rate || 0);
		nodes.reviewTotal.textContent = `${reviewCount} total`;
		renderImage();
		renderFavourite();
		renderReviews();
		updateBookingTotal();
	}

	function renderFavourite() {
		const active = state.favourites.has(Number(carId));
		nodes.favourite.classList.toggle('active', active);
		nodes.favourite.setAttribute('aria-label', active ? 'Remove from favourites' : 'Add to favourites');
	}

	function isBooked(dateString) {
		const date = new Date(`${dateString}T00:00:00`);
		return state.bookedRanges.some((range) => {
			const start = new Date(`${range.start_date}T00:00:00`);
			const end = new Date(`${range.end_date}T00:00:00`);
			return date >= start && date < end;
		});
	}

	function isSelected(dateString) {
		if (dateString === state.selectedStart || dateString === state.selectedEnd) {
			return true;
		}
		if (!state.selectedStart || !state.selectedEnd) {
			return false;
		}
		return dateString > state.selectedStart && dateString < state.selectedEnd;
	}

	function renderCalendar() {
		const month = state.visibleMonth;
		const year = month.getFullYear();
		const monthIndex = month.getMonth();
		const first = new Date(year, monthIndex, 1);
		const last = new Date(year, monthIndex + 1, 0);
		const startOffset = first.getDay();
		const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
		const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

		nodes.calendarTitle.textContent = `Availability — ${monthName}`;
		let html = days.map((day) => `<div class="calendar-day-name">${day}</div>`).join('');

		for (let i = 0; i < startOffset; i += 1) {
			html += '<button class="calendar-cell outside" type="button" tabindex="-1"></button>';
		}

		for (let day = 1; day <= last.getDate(); day += 1) {
			const date = new Date(year, monthIndex, day);
			const dateString = formatDate(date);
			const booked = isBooked(dateString);
			const selected = isSelected(dateString);
			const rangeClass = selected && dateString !== state.selectedStart && dateString !== state.selectedEnd ? 'in-range' : '';
			html += `<button class="calendar-cell ${booked ? 'booked' : ''} ${selected ? 'selected' : ''} ${rangeClass}" type="button" data-date="${dateString}" ${booked ? 'disabled' : ''}>${day}</button>`;
		}

		nodes.calendar.innerHTML = html;
	}

	function selectDate(dateString) {
		if (!state.selectedStart || (state.selectedStart && state.selectedEnd) || dateString < state.selectedStart) {
			state.selectedStart = dateString;
			state.selectedEnd = '';
		} else if (dateString > state.selectedStart) {
			state.selectedEnd = dateString;
		}

		nodes.form.start_date.value = state.selectedStart;
		nodes.form.end_date.value = state.selectedEnd;
		renderCalendar();
		updateBookingTotal();
	}

	function updateBookingTotal() {
		const start = nodes.form.start_date.value;
		const end = nodes.form.end_date.value;
		if (!state.car || !start || !end || end <= start) {
			nodes.total.hidden = true;
			return;
		}

		const days = daysBetween(start, end);
		const subtotal = days * Number(state.car.daily_rate);
		const discount = subtotal * state.discount / 100;
		const finalTotal = subtotal - discount;
		nodes.total.hidden = false;
		nodes.total.textContent = `${days} day${days === 1 ? '' : 's'} · ${window.UIUtils.formatMoney(subtotal)}${state.discount ? ` · ${state.discount}% off` : ''} · Total ${window.UIUtils.formatMoney(finalTotal)}`;
	}

	function renderReviews() {
		const reviews = state.car.reviews || [];
		if (!reviews.length) {
			nodes.reviews.innerHTML = '<div class="review-card"><p>No reviews yet. Be the first to review after your trip.</p></div>';
			return;
		}

		nodes.reviews.innerHTML = reviews.slice(0, 3).map((review) => {
			const name = review.reviewer_name || 'Customer';
			return `
				<article class="review-card">
					<div class="review-head">
						<div class="reviewer">
							<span>${escapeHtml(window.UIUtils.initials(name) || 'CU')}</span>
							<strong>${escapeHtml(name)}</strong>
						</div>
						<div class="stars">${'★'.repeat(Number(review.rating || 0))}${'☆'.repeat(5 - Number(review.rating || 0))}</div>
					</div>
					<p>${escapeHtml(review.comment || 'No written comment.')}</p>
					<div class="review-date">${escapeHtml(window.UIUtils.formatDate(review.created_at))}</div>
				</article>
			`;
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

	async function loadPage() {
		if (!carId) {
			nodes.title.textContent = 'Vehicle not found';
			return;
		}

		try {
			const me = await window.API.me();
			window.AppState?.setUser(me.data);
			const [carResponse, availabilityResponse] = await Promise.all([
				window.API.car(carId),
				window.API.carAvailability(carId),
				loadFavourites(),
			]);
			state.car = carResponse.data;
			state.bookedRanges = availabilityResponse.data || [];
			state.visibleMonth = new Date();
			renderDetails();
			renderCalendar();
		} catch (error) {
			if (error.message?.includes('Unauthenticated')) {
				window.location.replace('../auth/login.html');
				return;
			}
			nodes.title.textContent = 'Unable to load vehicle';
			nodes.description.textContent = error.message || 'Please try again.';
		}
	}

	function bindEvents() {
		nodes.calendar.addEventListener('click', (event) => {
			const button = event.target.closest('[data-date]');
			if (button) {
				selectDate(button.dataset.date);
			}
		});

		nodes.form.start_date.addEventListener('change', (event) => {
			state.selectedStart = event.target.value;
			renderCalendar();
			updateBookingTotal();
		});

		nodes.form.end_date.addEventListener('change', (event) => {
			state.selectedEnd = event.target.value;
			renderCalendar();
			updateBookingTotal();
		});

		nodes.prevMonth.addEventListener('click', () => {
			state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
			renderCalendar();
		});

		nodes.nextMonth.addEventListener('click', () => {
			state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
			renderCalendar();
		});

		nodes.favourite.addEventListener('click', async () => {
			const active = state.favourites.has(Number(carId));
			nodes.favourite.disabled = true;
			try {
				if (active) {
					await window.API.removeFavourite(carId);
					state.favourites.delete(Number(carId));
				} else {
					await window.API.addFavourite(carId);
					state.favourites.add(Number(carId));
				}
				renderFavourite();
			} catch (error) {
				setMessage(error.message || 'Could not update favourites.', 'error');
			} finally {
				nodes.favourite.disabled = false;
			}
		});

		nodes.promoButton.addEventListener('click', async () => {
			const code = nodes.form.promo_code.value.trim();
			if (!code) {
				setMessage('Enter a promo code first.', 'error');
				return;
			}
			try {
				const response = await window.API.validatePromo(code);
				state.discount = Number(response.data.discount_percentage || 0);
				setMessage(`${response.data.code} applied: ${state.discount}% off.`);
				updateBookingTotal();
			} catch (error) {
				state.discount = 0;
				setMessage(error.message || 'Promo code is not valid.', 'error');
				updateBookingTotal();
			}
		});

		nodes.form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const start = nodes.form.start_date.value;
			const end = nodes.form.end_date.value;
			if (!start || !end || end <= start) {
				setMessage('Choose a valid pick-up and return date.', 'error');
				return;
			}

			try {
				const response = await window.API.createBooking({
					car_id: Number(carId),
					start_date: start,
					end_date: end,
					promo_code: nodes.form.promo_code.value.trim() || undefined,
				});
				window.location.href = `./booking-confirmed.html?id=${response.data.id}`;
			} catch (error) {
				setMessage(error.message || 'Unable to create booking.', 'error');
			}
		});

		nodes.logout.addEventListener('click', async () => {
			try {
				await window.API.logout();
			} finally {
				window.AppState?.clearUser();
				window.location.replace('../auth/login.html');
			}
		});
	}

	bindEvents();
	loadPage();
})();
