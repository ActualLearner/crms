(() => {
	const F = window.CustomerFlow;
	const params = new URLSearchParams(window.location.search);
	const bookingId = params.get('booking_id') || params.get('id');
	const form = document.querySelector('[data-extend-form]');
	const strip = document.querySelector('[data-booking-strip]');
	const dateInput = document.getElementById('new-return-date');
	const summary = document.querySelector('[data-extension-summary]');
	const quickPills = document.querySelector('[data-quick-pills]');
	const note = document.querySelector('[data-availability-note]');
	const submit = document.querySelector('[data-submit-extension]');
	let booking = null;

	function isoAdd(date, amount) {
		const d = new Date(`${date}T00:00:00`);
		d.setDate(d.getDate() + amount);
		return d.toISOString().slice(0, 10);
	}

	function renderSummary() {
		if (!booking || !dateInput.value) {
			summary.hidden = true;
			return;
		}
		const extraDays = Math.max(0, F.days(booking.end_date, dateInput.value));
		const cost = extraDays * Number(booking.daily_rate || 0);
		summary.hidden = false;
		summary.innerHTML = `
			<div class="summary-line"><span>Original return</span><strong>${F.date(booking.end_date)}</strong></div>
			<div class="summary-line"><span>New return</span><strong>${F.date(dateInput.value)}</strong></div>
			<div class="summary-line"><span>Extra days</span><strong>${extraDays}</strong></div>
			<div class="summary-total"><span>Estimated charge</span><strong>${F.money(cost)}</strong></div>
		`;
		note.textContent = `${booking.brand} ${booking.model} appears available unless another booking conflicts.`;
	}

	async function loadBooking() {
		let page = 1;
		let lastPage = 1;
		const bookings = [];
		do {
			const res = await window.API.myBookings({ page });
			bookings.push(...(res.data?.data || []));
			lastPage = Number(res.data?.last_page || 1);
			page += 1;
		} while (page <= lastPage);
		return bookingId
			? bookings.find(item => String(item.id) === String(bookingId))
			: bookings.find(item => item.status === 'active');
	}

	async function init() {
		const user = await F.requireUser();
		if (!user) return;
		F.logout();
		try {
			booking = await loadBooking();
			if (!booking) {
				form.innerHTML = '<div class="flow-alert danger">No active booking found to extend.</div><a class="flow-button" href="./bookings.html">Back to bookings</a>';
				return;
			}
			strip.innerHTML = F.bookingStrip(booking);
			dateInput.min = isoAdd(booking.end_date, 1);
			dateInput.value = dateInput.min;
			quickPills.innerHTML = [1, 2, 3, 7].map(days => `<button type="button" data-add-days="${days}">+${days}d</button>`).join('');
			if (booking.status !== 'active') {
				submit.disabled = true;
				form.insertAdjacentHTML('beforeend', '<div class="flow-alert danger">This booking is not active yet. The backend currently rejects extension requests until a booking is active.</div>');
			}
			renderSummary();
		} catch (error) {
			form.innerHTML = `<div class="flow-alert danger">${F.escapeHtml(error.message || 'Unable to load booking.')}</div>`;
		}
	}

	dateInput?.addEventListener('input', renderSummary);
	quickPills?.addEventListener('click', event => {
		const btn = event.target.closest('[data-add-days]');
		if (!btn || !booking) return;
		dateInput.value = isoAdd(booking.end_date, Number(btn.dataset.addDays));
		renderSummary();
	});

	form?.addEventListener('submit', async event => {
		event.preventDefault();
		if (!booking || !dateInput.value) return;
		submit.disabled = true;
		try {
			await window.API.extendBooking(booking.id, dateInput.value);
			form.innerHTML = '<div class="flow-alert success">Extension requested successfully.</div><a class="flow-button primary" href="./bookings.html">Back to bookings</a>';
		} catch (error) {
			window.UIUtils?.toast(error.message || 'Unable to request extension.', 'error');
			submit.disabled = false;
		}
	});

	init();
})();
