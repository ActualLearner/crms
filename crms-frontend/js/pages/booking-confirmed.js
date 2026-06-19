(() => {
	const params = new URLSearchParams(window.location.search);
	const bookingId = Number(params.get('id') || 0);

	// Keep in sync with Booking::HOLD_MINUTES on the API — the dates are released
	// server-side after this window, so the countdown is purely a UX mirror of it.
	const HOLD_MINUTES = 10;
	let countdownTimer = null;

	const nodes = {
		reference: document.querySelector('[data-reference]'),
		copyReference: document.querySelector('[data-copy-reference]'),
		userEmail: document.querySelector('[data-user-email]'),
		status: document.querySelector('[data-status]'),
		heroTitle: document.querySelector('[data-hero-title]'),
		heroCopy: document.querySelector('[data-hero-copy]'),
		successMark: document.querySelector('[data-success-mark]'),
		holdBanner: document.querySelector('[data-hold-banner]'),
		holdTimer: document.querySelector('[data-hold-timer]'),
		expiredBanner: document.querySelector('[data-expired-banner]'),
		rebookLink: document.querySelector('[data-rebook-link]'),
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
		paymentStatus: document.querySelector('[data-payment-status]'),
		paymentTxRef: document.querySelector('[data-payment-tx-ref]'),
		payChapa: document.querySelector('[data-pay-chapa]'),
		verifyPayment: document.querySelector('[data-verify-payment]'),
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

	function paymentStatusText(status) {
		const normalized = String(status || 'unpaid').toLowerCase();
		if (normalized === 'paid') return 'Paid';
		if (normalized === 'pending') return 'Payment pending';
		if (normalized === 'failed') return 'Payment failed';
		return 'Unpaid';
	}

	// When the 10-minute hold ends (computed from created_at, which the API returns in UTC).
	function holdDeadline(booking) {
		const raw = String(booking.created_at || '');
		if (!raw) return null;
		const created = new Date(`${raw.replace(' ', 'T')}Z`);
		return Number.isNaN(created.getTime()) ? null : created.getTime() + HOLD_MINUTES * 60000;
	}

	function isHoldExpired(booking) {
		const deadline = holdDeadline(booking);
		return deadline !== null && Date.now() >= deadline;
	}

	function stopCountdown() {
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
	}

	function renderPayment(booking) {
		const status = String(booking.payment_status || 'unpaid').toLowerCase();
		const paid = status === 'paid';
		const expired = !paid && isHoldExpired(booking);

		nodes.paymentStatus.textContent = paymentStatusText(status);
		nodes.paymentStatus.className = `status-pill inline payment-status ${status}`;
		nodes.paymentTxRef.textContent = booking.payment_tx_ref || booking.reference_number || '--';

		nodes.payChapa.hidden = paid || expired;
		nodes.payChapa.dataset.bookingId = booking.id;
		nodes.verifyPayment.hidden = paid || expired;
		nodes.verifyPayment.disabled = !booking.payment_tx_ref;
		nodes.verifyPayment.dataset.bookingId = booking.id;

		// Hero + banners reflect the three states: paid, awaiting payment, expired hold.
		nodes.successMark.hidden = !paid;
		nodes.holdBanner.hidden = paid || expired;
		nodes.expiredBanner.hidden = paid || !expired;
		if (nodes.rebookLink) {
			nodes.rebookLink.href = `./car-detail.html?id=${booking.car_id}&book=1`;
		}

		if (paid) {
			nodes.heroTitle.textContent = 'Booking confirmed!';
			nodes.heroCopy.textContent = 'Payment received — your car is reserved. A confirmation is on its way to your email.';
			stopCountdown();
		} else if (expired) {
			nodes.heroTitle.textContent = 'Reservation expired';
			nodes.heroCopy.textContent = 'Your 10-minute hold ended before payment completed. Book the car again to get fresh dates.';
			stopCountdown();
		} else {
			nodes.heroTitle.textContent = 'Complete your booking';
			nodes.heroCopy.textContent = 'Pay securely with Chapa to confirm your reservation.';
			startCountdown(booking);
		}
	}

	function startCountdown(booking) {
		const deadline = holdDeadline(booking);
		stopCountdown();
		if (deadline === null) {
			nodes.holdTimer.textContent = `${HOLD_MINUTES}:00`;
			return;
		}

		const tick = () => {
			const remaining = Math.max(0, deadline - Date.now());
			const minutes = Math.floor(remaining / 60000);
			const seconds = Math.floor((remaining % 60000) / 1000);
			nodes.holdTimer.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
			if (remaining <= 0) {
				stopCountdown();
				// Hold lapsed while the page was open — flip to the expired state.
				renderPayment(booking);
			}
		};

		tick();
		countdownTimer = setInterval(tick, 1000);
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
		renderPayment(booking);
	}

	async function findBooking() {
		const response = await window.API.myBookings({ page: 1 });
		const bookings = response.data?.data || [];
		// Match exactly — an expired hold is deleted server-side, so never fall back
		// to another booking and render the wrong one on the checkout page.
		return bookings.find((booking) => Number(booking.id) === bookingId) || null;
	}

	function renderExpiredHold() {
		stopCountdown();
		nodes.reference.textContent = 'Expired';
		nodes.successMark.hidden = true;
		nodes.holdBanner.hidden = true;
		nodes.expiredBanner.hidden = false;
		nodes.heroTitle.textContent = 'Reservation expired';
		nodes.heroCopy.textContent = 'Your 10-minute hold ended before payment completed. Book the car again to get fresh dates.';
		nodes.payChapa.hidden = true;
		nodes.verifyPayment.hidden = true;
	}

	async function init() {
		try {
			const me = await window.API.me();
			window.AppState?.setUser(me.data);
			nodes.userEmail.textContent = me.data?.email || 'your email';

			const booking = await findBooking();
			if (!booking) {
				// Either the hold already lapsed and was cleaned up, or it's not on page 1.
				renderExpiredHold();
				return;
			}

			renderBooking(booking);

			if (params.get('payment') === 'returned' && booking.id && String(booking.payment_status || '').toLowerCase() !== 'paid') {
				try {
					await window.API.verifyChapaPayment({ booking_id: Number(booking.id) });
					const refreshed = await findBooking();
					if (refreshed) renderBooking(refreshed);
				} catch (error) {
					window.UIUtils?.toast(error.message || 'Unable to refresh payment status.', 'error');
				}
			}
		} catch (error) {
			if (error.message?.includes('Unauthenticated')) {
				window.location.replace('../auth/login.html');
				return;
			}
			nodes.reference.textContent = 'Unavailable';
			nodes.carName.textContent = error.message || 'Unable to load booking.';
		}
	}

	nodes.payChapa.addEventListener('click', async () => {
		const bookingIdToPay = Number(nodes.payChapa.dataset.bookingId || bookingId);
		if (!bookingIdToPay) {
			return;
		}
		nodes.payChapa.disabled = true;
		nodes.payChapa.textContent = 'Opening Chapa...';
		try {
			const response = await window.API.initializeChapaPayment(bookingIdToPay);
			const checkoutUrl = response.data?.checkout_url;
			if (!checkoutUrl) {
				throw new Error('Chapa did not return a checkout URL.');
			}
			window.location.href = checkoutUrl;
		} catch (error) {
			window.UIUtils?.toast(error.message || 'Unable to start Chapa checkout.', 'error');
			nodes.payChapa.disabled = false;
			nodes.payChapa.textContent = 'Pay with Chapa';
		}
	});

	nodes.verifyPayment.addEventListener('click', async () => {
		const bookingIdToVerify = Number(nodes.verifyPayment.dataset.bookingId || bookingId);
		if (!bookingIdToVerify) {
			return;
		}
		nodes.verifyPayment.disabled = true;
		nodes.verifyPayment.textContent = 'Verifying...';
		try {
			await window.API.verifyChapaPayment({ booking_id: bookingIdToVerify });
			window.UIUtils?.toast('Payment status updated');
			const booking = await findBooking();
			if (booking) renderBooking(booking);
		} catch (error) {
			window.UIUtils?.toast(error.message || 'Unable to verify payment.', 'error');
		} finally {
			nodes.verifyPayment.textContent = 'Refresh status';
			nodes.verifyPayment.disabled = false;
		}
	});

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
