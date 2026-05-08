(() => {
	const params = new URLSearchParams(window.location.search);
	const bookingId = Number(params.get('id') || 0);

	const nodes = {
		reference: document.querySelector('[data-reference]'),
		copyReference: document.querySelector('[data-copy-reference]'),
		userEmail: document.querySelector('[data-user-email]'),
		status: document.querySelector('[data-status]'),
		carLink: document.querySelector('[data-car-link]'),
		vehicleMedia: document.querySelector('[data-vehicle-media]'),
		carName: document.querySelector('[data-car-name]'),
		carMeta: document.querySelector('[data-car-meta]'),
		category: document.querySelector('[data-category]'),
		transmission: document.querySelector('[data-transmission]'),
		seats: document.querySelector('[data-seats]'),
		power: document.querySelector('[data-power]'),
		startDate: document.querySelector('[data-start-date]'),
		endDate: document.querySelector('[data-end-date]'),
		duration: document.querySelector('[data-duration]'),
		rateLine: document.querySelector('[data-rate-line]'),
		baseTotal: document.querySelector('[data-base-total]'),
		penaltyRate: document.querySelector('[data-penalty-rate]'),
		discountLine: document.querySelector('[data-discount-line]'),
		discount: document.querySelector('[data-discount]'),
		finalTotal: document.querySelector('[data-final-total]'),
		logout: document.querySelector('[data-logout]'),
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

	function daysBetween(start, end) {
		return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
	}

	function formatLongDate(value) {
		return new Intl.DateTimeFormat(undefined, {
			weekday: 'short',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		}).format(new Date(`${value}T00:00:00`));
	}

	function fallbackCar() {
		return '<div class="detail-fallback-car" aria-hidden="true"></div>';
	}

	function renderVehicleImage(booking) {
		const imageUrl = window.API.resolveUrl(booking.image_url);
		nodes.vehicleMedia.innerHTML = imageUrl
			? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${booking.brand} ${booking.model}`)}" />`
			: fallbackCar();
	}

	function renderBooking(booking) {
		const carName = `${booking.brand} ${booking.model}`;
		const duration = daysBetween(booking.start_date, booking.end_date);
		const baseTotal = Number(booking.base_total || 0);
		const discount = Number(booking.discount_amount || 0);
		const finalTotal = Number(booking.final_total || 0);
		const dailyRate = duration ? baseTotal / duration : baseTotal;

		document.title = `CRMS - ${booking.reference_number}`;
		nodes.reference.textContent = booking.reference_number;
		nodes.status.textContent = categoryLabel(booking.status || 'pending');
		nodes.carLink.textContent = carName;
		nodes.carLink.href = `./car-detail.html?id=${booking.car_id}`;
		nodes.carName.textContent = carName;
		nodes.carMeta.textContent = `${booking.year || ''} ${categoryLabel(booking.category || '')}`.trim();
		nodes.category.textContent = categoryLabel(booking.category || 'Vehicle');
		nodes.transmission.textContent = categoryLabel(booking.transmission || 'Auto');
		nodes.seats.textContent = booking.seats ? `${booking.seats} seats` : '5 seats';
		nodes.power.textContent = '250 hp';
		nodes.startDate.textContent = formatLongDate(booking.start_date);
		nodes.endDate.textContent = formatLongDate(booking.end_date);
		nodes.duration.textContent = `${duration} day${duration === 1 ? '' : 's'}`;
		nodes.rateLine.textContent = `${window.UIUtils.formatMoney(dailyRate)} × ${duration} day${duration === 1 ? '' : 's'}`;
		nodes.baseTotal.textContent = window.UIUtils.formatMoney(baseTotal);
		nodes.penaltyRate.textContent = `${window.UIUtils.formatMoney(booking.penalty_rate || 0)} / late day`;
		nodes.finalTotal.textContent = window.UIUtils.formatMoney(finalTotal);
		nodes.discountLine.hidden = discount <= 0;
		nodes.discount.textContent = `-${window.UIUtils.formatMoney(discount)}`;
		renderVehicleImage(booking);
	}

	async function findBooking() {
		const response = await window.API.myBookings({ page: 1 });
		const bookings = response.data?.data || [];
		return bookings.find((booking) => Number(booking.id) === bookingId) || bookings[0];
	}

	async function init() {
		try {
			const me = await window.API.me();
			window.AppState?.setUser(me.data);
			nodes.userEmail.textContent = me.data?.email || 'your email';

			const booking = await findBooking();
			if (!booking) {
				nodes.reference.textContent = 'Not found';
				nodes.carName.textContent = 'Booking not found';
				return;
			}

			renderBooking(booking);
		} catch (error) {
			if (error.message?.includes('Unauthenticated')) {
				window.location.replace('../auth/login.html');
				return;
			}
			nodes.reference.textContent = 'Unavailable';
			nodes.carName.textContent = error.message || 'Unable to load booking.';
		}
	}

	nodes.copyReference.addEventListener('click', async () => {
		const reference = nodes.reference.textContent.trim();
		if (!reference || reference === 'Loading...') {
			return;
		}
		try {
			await navigator.clipboard.writeText(reference);
			nodes.copyReference.querySelector('span').textContent = 'COPIED';
		} catch {
			nodes.copyReference.querySelector('span').textContent = 'REF.';
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

	init();
})();
