(() => {
	const UI = window.AdminUI;
	UI.init('bookings');
	let bookings = [];
	let activeStatus = 'all';
	let returnBooking = null;

	const body = document.getElementById('bookings-table');
	const search = document.getElementById('booking-search');
	const modal = document.getElementById('return-modal');
	const form = document.getElementById('return-form');
	const condition = document.getElementById('return-condition');

	function normalizeStatus(status) {
		return status === 'completed' ? 'returned' : status;
	}

	function updateStats() {
		UI.setText('bookings-total', bookings.length);
		UI.setText('bookings-pending', bookings.filter(b => b.status === 'pending').length);
		UI.setText('bookings-active', bookings.filter(b => ['active', 'confirmed'].includes(b.status)).length);
		UI.setText('bookings-returned', bookings.filter(b => b.status === 'completed').length);
	}

	function filtered() {
		const q = search.value.trim().toLowerCase();
		return bookings.filter(booking => {
			const statusOk = activeStatus === 'all' ||
				booking.status === activeStatus ||
				(activeStatus === 'active' && booking.status === 'confirmed');
			const haystack = `${booking.customer_name} ${booking.customer_email} ${booking.brand} ${booking.model} ${booking.reference_number}`.toLowerCase();
			return statusOk && (!q || haystack.includes(q));
		});
	}

	function actions(booking) {
		if (booking.status === 'pending') {
			return `<button class="admin-btn primary" data-confirm="${booking.id}">Confirm</button>`;
		}
		if (['active', 'confirmed'].includes(booking.status)) {
			return `<button class="admin-btn" data-return="${booking.id}">Log return</button>`;
		}
		return '<span class="tone-muted">—</span>';
	}

	function render() {
		const rows = filtered();
		body.innerHTML = rows.length ? rows.map(booking => `
			<tr>
				<td class="tone-muted">#${UI.escape(booking.reference_number || booking.id)}</td>
				<td><strong class="truncate">${UI.escape(booking.customer_name)}</strong></td>
				<td>${UI.escape(booking.brand)} ${UI.escape(booking.model)}</td>
				<td>${UI.date(booking.start_date)}</td>
				<td>${UI.date(booking.end_date)}</td>
				<td><strong>${UI.money(booking.final_total)}</strong></td>
				<td>${UI.status(normalizeStatus(booking.status))}</td>
				<td><div class="admin-row-actions">${actions(booking)}</div></td>
			</tr>
		`).join('') : `<tr><td colspan="8">${UI.empty('No bookings match those filters.')}</td></tr>`;
	}

	async function load() {
		try {
			const res = await window.API.allBookings({ page: 1 });
			bookings = UI.unwrap(res).items;
			updateStats();
			render();
		} catch (error) {
			console.error(error);
			body.innerHTML = `<tr><td colspan="8">${UI.empty(`Unable to load bookings: ${UI.escape(error.message)}`)}</td></tr>`;
		}
	}

	function openReturn(id) {
		returnBooking = bookings.find(booking => String(booking.id) === String(id));
		if (!returnBooking) return;
		document.getElementById('return-summary').innerHTML = `<strong>${UI.escape(returnBooking.brand)} ${UI.escape(returnBooking.model)}</strong> rented by ${UI.escape(returnBooking.customer_name)} · expected ${UI.date(returnBooking.expected_return_date || returnBooking.end_date)}`;
		document.getElementById('actual-return-date').value = new Date().toISOString().slice(0, 10);
		condition.value = 'excellent';
		toggleDamage();
		modal.showModal();
	}

	function toggleDamage() {
		const damaged = condition.value === 'damaged';
		document.querySelectorAll('[data-damage-field]').forEach(el => { el.hidden = !damaged; });
	}

	document.querySelector('[data-booking-tabs]')?.addEventListener('click', event => {
		const btn = event.target.closest('[data-status]');
		if (!btn) return;
		activeStatus = btn.dataset.status;
		document.querySelectorAll('[data-status]').forEach(tab => tab.classList.toggle('active', tab === btn));
		render();
	});

	search?.addEventListener('input', render);
	condition?.addEventListener('change', toggleDamage);
	document.querySelectorAll('[data-close-return]').forEach(btn => btn.addEventListener('click', () => modal.close()));

	body?.addEventListener('click', async event => {
		const confirm = event.target.closest('[data-confirm]');
		const ret = event.target.closest('[data-return]');
		if (confirm) {
			try {
				await window.API.confirmBooking(confirm.dataset.confirm);
				UI.toast('Booking confirmed');
				await load();
			} catch (error) {
				UI.toast(error.message);
			}
		}
		if (ret) openReturn(ret.dataset.return);
	});

	form?.addEventListener('submit', async event => {
		event.preventDefault();
		if (!returnBooking) return;
		const data = Object.fromEntries(new FormData(form).entries());
		if (data.condition !== 'damaged') {
			delete data.damage_description;
			delete data.repair_cost;
		}
		try {
			await window.API.returnBooking(returnBooking.id, data);
			modal.close();
			UI.toast('Return logged');
			await load();
		} catch (error) {
			UI.toast(error.message);
		}
	});

	document.querySelector('[data-export-bookings]')?.addEventListener('click', () => UI.toast('CSV export is ready to wire to a backend export endpoint.'));
	load();
})();
