(() => {
	const UI = window.AdminUI;
	UI.init('customers');
	const id = new URLSearchParams(window.location.search).get('id');
	const profile = document.getElementById('customer-profile');
	const history = document.getElementById('customer-history');

	function days(start, end) {
		const s = new Date(`${String(start).slice(0, 10)}T00:00:00`);
		const e = new Date(`${String(end).slice(0, 10)}T00:00:00`);
		if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
		return Math.max(1, Math.round((e - s) / 86400000));
	}

	function renderProfile(customer) {
		const verified = Number(customer.license_verified) === 1;
		const bookings = customer.bookings || [];
		const active = bookings.some(b => ['active', 'confirmed'].includes(b.status));
		document.getElementById('crumb-name').textContent = customer.name;
		document.getElementById('detail-title').textContent = customer.name;
		profile.innerHTML = `
			<div class="profile-hero">
				<span class="avatar-token">${UI.initials(customer.name)}</span>
				<h2>${UI.escape(customer.name)}</h2>
				<p class="tone-muted">${UI.escape(customer.email)}</p>
				${UI.status(verified ? 'verified' : 'pending')}
			</div>
			<div class="key-value">
				<div><span>Phone</span><strong>${UI.escape(customer.phone || '—')}</strong></div>
				<div><span>Joined</span><strong>${UI.date(customer.created_at)}</strong></div>
				<div><span>License no.</span><strong>${UI.escape(customer.license_number || '—')}</strong></div>
				<div><span>Status</span><strong>${active ? 'Renting now' : 'No active rental'}</strong></div>
			</div>
			<div class="metric-grid">
				<div class="metric-tile"><span>Total rentals</span><strong>${bookings.length}</strong></div>
				<div class="metric-tile"><span>Total spent</span><strong>${UI.money(customer.total_spent)}</strong></div>
			</div>
			<button class="admin-btn ${verified ? '' : 'primary'}" data-verify="${customer.id}">${verified ? 'Remove verification' : 'Verify license'}</button>
			<button class="admin-btn danger" type="button">Suspend account</button>
		`;
	}

	function renderHistory(bookings = []) {
		history.innerHTML = bookings.length ? bookings.map(booking => `
			<tr>
				<td class="tone-muted">#${UI.escape(booking.reference_number || booking.id)}</td>
				<td><strong>${UI.escape(booking.brand)} ${UI.escape(booking.model)}</strong></td>
				<td>${UI.status(booking.status === 'completed' ? (booking.condition || 'returned') : booking.status)}</td>
				<td>${UI.date(booking.start_date)}</td>
				<td>${UI.date(booking.end_date)}</td>
				<td>${days(booking.start_date, booking.end_date)}</td>
				<td><strong>${UI.money(booking.final_total)}</strong></td>
			</tr>
		`).join('') : `<tr><td colspan="7">${UI.empty('No rental history yet.')}</td></tr>`;
	}

	async function load() {
		if (!id) {
			profile.innerHTML = UI.empty('Missing customer id.');
			return;
		}
		try {
			const res = await window.API.adminCustomer(id);
			const customer = res.data || {};
			renderProfile(customer);
			renderHistory(customer.bookings || []);
		} catch (error) {
			console.error(error);
			profile.innerHTML = UI.empty(`Unable to load customer: ${UI.escape(error.message)}`);
			history.innerHTML = `<tr><td colspan="7">${UI.empty('No history available.')}</td></tr>`;
		}
	}

	profile?.addEventListener('click', async event => {
		const btn = event.target.closest('[data-verify]');
		if (!btn) return;
		try {
			await window.API.verifyLicense(btn.dataset.verify);
			UI.toast('License status updated');
			await load();
		} catch (error) {
			UI.toast(error.message);
		}
	});
	load();
})();
