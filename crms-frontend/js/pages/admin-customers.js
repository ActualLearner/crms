(() => {
	const UI = window.AdminUI;
	UI.init('customers');
	let customers = [];
	let activeFilter = 'all';
	const body = document.getElementById('customers-table');
	const search = document.getElementById('customer-search');
	let stats = { verified: 0, pending: 0, renting: 0 };

	function updateStats(total) {
		UI.setText('customers-total', total ?? customers.length);
		UI.setText('customers-verified', stats.verified ?? 0);
		UI.setText('customers-pending', stats.pending ?? 0);
		UI.setText('customers-renting', stats.renting ?? 0);
	}

	function filtered() {
		const q = search.value.trim().toLowerCase();
		return customers.filter(customer => {
			const verified = Number(customer.license_verified) === 1;
			const filterOk =
				activeFilter === 'all' ||
				(activeFilter === 'verified' && verified) ||
				(activeFilter === 'pending' && !verified) ||
				(activeFilter === 'renting' && customer.currently_renting);
			const haystack = `${customer.name} ${customer.email} ${customer.phone || ''}`.toLowerCase();
			return filterOk && (!q || haystack.includes(q));
		});
	}

	function render() {
		const rows = filtered();
		body.innerHTML = rows.length ? rows.map(customer => {
			const verified = Number(customer.license_verified) === 1;
			const hasLicenseNumber = Boolean(String(customer.license_number || '').trim());
			return `
				<tr>
					<td><div class="identity-cell"><span class="avatar-token">${UI.initials(customer.name)}</span>${customer.currently_renting ? '<span class="live-dot"></span>' : ''}<strong class="truncate">${UI.escape(customer.name)}</strong></div></td>
					<td><span class="truncate">${UI.escape(customer.email)}</span></td>
					<td>${UI.date(customer.created_at)}</td>
					<td><strong>${customer.booking_count}</strong></td>
					<td><strong>${UI.money(customer.total_spent)}</strong></td>
					<td>
						<div class="license-cell">
							${UI.status(verified ? 'verified' : 'pending')}
							<small class="tone-muted">${UI.escape(hasLicenseNumber ? customer.license_number : 'No license number')}</small>
						</div>
					</td>
					<td>
						<div class="admin-row-actions">
							<a class="admin-btn" href="./customer-detail.html?id=${customer.id}">View</a>
							<button class="admin-btn ${verified ? '' : 'primary'}" data-verify="${customer.id}" ${!hasLicenseNumber ? 'disabled' : ''}>${!hasLicenseNumber ? 'No license' : (verified ? 'Unverify' : 'Verify')}</button>
						</div>
					</td>
				</tr>`;
		}).join('') : `<tr><td colspan="7">${UI.empty('No customers match those filters.')}</td></tr>`;
	}


	async function load() {
		try {
			const res = await window.API.adminCustomers({ page: 1 });
			const unwrapped = UI.unwrap(res);
			stats = unwrapped.meta?.stats || stats;
			customers = unwrapped.items.map(customer => ({
				...customer,
				booking_count: Number(customer.booking_count || 0),
				total_spent: Number(customer.total_spent || 0),
				currently_renting: Boolean(customer.currently_renting),
			}));
			updateStats(unwrapped.total);
			render();
		} catch (error) {
			console.error(error);
			body.innerHTML = `<tr><td colspan="7">${UI.empty(`Unable to load customers: ${UI.escape(error.message)}`)}</td></tr>`;
		}
	}

	document.querySelector('[data-customer-tabs]')?.addEventListener('click', event => {
		const btn = event.target.closest('[data-filter]');
		if (!btn) return;
		activeFilter = btn.dataset.filter;
		document.querySelectorAll('[data-filter]').forEach(tab => tab.classList.toggle('active', tab === btn));
		render();
	});

	search?.addEventListener('input', render);
	body?.addEventListener('click', async event => {
		const btn = event.target.closest('[data-verify]');
		if (!btn) return;
		const isUnverify = btn.textContent.trim().toLowerCase().startsWith('unverify');
		if (isUnverify) {
			const confirmed = await UI.ask('Remove verification from this customer? They will no longer be able to make bookings.', {
				title: 'Remove license verification',
				confirmText: 'Remove verification',
			});
			if (!confirmed) return;
		}
		try {
			await window.API.verifyLicense(btn.dataset.verify);
			UI.toast('License status updated');
			await load();
		} catch (error) {
			UI.toast(error.message);
		}
	});
	document.querySelector('[data-export-customers]')?.addEventListener('click', () => UI.toast('CSV export is ready to wire to a backend export endpoint.'));
	load();
})();
