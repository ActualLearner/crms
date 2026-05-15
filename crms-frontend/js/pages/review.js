(() => {
	const F = window.CustomerFlow;
	const params = new URLSearchParams(window.location.search);
	const bookingId = params.get('booking_id') || params.get('id');
	const strip = document.querySelector('[data-booking-strip]');
	const form = document.querySelector('[data-review-form]');
	const stars = document.querySelector('[data-stars]');
	const ratingLabel = document.querySelector('[data-rating-label]');
	const categories = document.querySelector('[data-category-ratings]');
	const comment = document.getElementById('review-comment');
	const count = document.querySelector('[data-review-count]');
	let booking = null;
	let rating = 0;

	function setRating(value) {
		rating = value;
		stars.querySelectorAll('button').forEach((button, index) => {
			button.classList.toggle('active', index < value);
			button.textContent = index < value ? '★' : '☆';
		});
		ratingLabel.textContent = value ? `${value} out of 5` : 'Tap to rate';
	}

	function renderStars() {
		stars.innerHTML = Array.from({ length: 5 }, (_, index) => `<button class="flow-star" type="button" data-rate="${index + 1}" aria-label="${index + 1} stars">☆</button>`).join('');
		categories.innerHTML = ['Cleanliness', 'Pickup', 'Comfort'].map(label => `
			<div class="rating-row">
				<span>${label}</span>
				<div class="mini-stars">${Array.from({ length: 5 }, (_, index) => `<button type="button" data-mini-rate="${label}-${index + 1}">☆</button>`).join('')}</div>
			</div>
		`).join('');
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
			: bookings.find(item => item.status === 'completed');
	}

	async function init() {
		const user = await F.requireUser();
		if (!user) return;
		F.logout();
		renderStars();
		try {
			booking = await loadBooking();
			if (!booking) {
				form.innerHTML = '<div class="flow-alert danger">No completed booking found to review.</div><a class="flow-button" href="./bookings.html">Back to bookings</a>';
				return;
			}
			strip.innerHTML = F.bookingStrip(booking);
			if (booking.status !== 'completed') {
				form.querySelector('button[type="submit"]').disabled = true;
				form.insertAdjacentHTML('beforeend', '<div class="flow-alert danger">Only completed bookings can be reviewed.</div>');
			}
		} catch (error) {
			form.innerHTML = `<div class="flow-alert danger">${F.escapeHtml(error.message || 'Unable to load booking.')}</div>`;
		}
	}

	stars?.addEventListener('click', event => {
		const btn = event.target.closest('[data-rate]');
		if (btn) setRating(Number(btn.dataset.rate));
	});

	categories?.addEventListener('click', event => {
		const btn = event.target.closest('[data-mini-rate]');
		if (!btn) return;
		const [name, value] = btn.dataset.miniRate.split('-');
		btn.closest('.mini-stars').querySelectorAll('button').forEach((item, index) => {
			item.textContent = index < Number(value) ? '★' : '☆';
		});
	});

	comment?.addEventListener('input', () => {
		count.textContent = comment.value.length;
	});

	form?.addEventListener('submit', async event => {
		event.preventDefault();
		if (!booking || !rating) {
			window.alert('Choose an overall rating first.');
			return;
		}
		const submit = form.querySelector('button[type="submit"]');
		submit.disabled = true;
		try {
			await window.API.submitReview(booking.id, rating, comment.value.trim());
			form.innerHTML = '<div class="flow-alert success">Review submitted. Thanks for helping future renters.</div><a class="flow-button primary" href="./bookings.html">Back to bookings</a>';
		} catch (error) {
			window.alert(error.message || 'Unable to submit review.');
			submit.disabled = false;
		}
	});

	init();
})();
