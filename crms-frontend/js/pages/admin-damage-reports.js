(() => {
	const UI = window.AdminUI;
	UI.init('damage-reports');

	let reports = [];
	let activeStatus = 'all';

	const body = document.getElementById('damage-reports-table');
	const search = document.getElementById('report-search');

	function statusLabel(resolved) {
		return resolved ? 'resolved' : 'open';
	}

	function updateStats() {
		const total = reports.length;
		const open = reports.filter(report => !Number(report.resolved)).length;
		const resolved = total - open;
		UI.setText('reports-total', total);
		UI.setText('reports-open', open);
		UI.setText('reports-resolved', resolved);
		UI.setText('reports-needs-action', open);
	}

	function matchesFilter(report) {
		if (activeStatus === 'all') {
			return true;
		}
		if (activeStatus === 'open') {
			return !Number(report.resolved);
		}
		return Number(report.resolved) === 1;
	}

	function filteredReports() {
		const term = search?.value?.trim().toLowerCase() || '';
		return reports.filter(report => {
			if (!matchesFilter(report)) {
				return false;
			}
			if (!term) {
				return true;
			}
			const haystack = `${report.brand || ''} ${report.model || ''} ${report.customer_name || ''} ${report.description || ''}`.toLowerCase();
			return haystack.includes(term);
		});
	}

	function render() {
		const rows = filteredReports();
		if (!body) return;
		body.innerHTML = rows.length
			? rows.map(report => {
				const isResolved = Number(report.resolved) === 1;
				return `
					<tr>
						<td>#${UI.escape(report.id)}</td>
						<td><strong>${UI.escape(report.brand)} ${UI.escape(report.model)}</strong></td>
						<td>${UI.escape(report.customer_name || '—')}</td>
						<td>${UI.escape(report.description || '—')}</td>
						<td><strong>${UI.money(report.repair_cost || 0)}</strong></td>
						<td>${UI.date(report.created_at)}</td>
						<td>${UI.status(statusLabel(isResolved))}</td>
						<td>
							<div class="admin-row-actions">
								${isResolved
									? '<span class="tone-muted">Resolved</span>'
									: `<button class="admin-btn success" data-resolve="${report.id}">Resolve</button>`}
							</div>
						</td>
					</tr>
				`;
			}).join('')
			: `<tr><td colspan="8">${UI.empty('No damage reports match those filters.')}</td></tr>`;
	}

	async function load() {
		if (!body) return;
		body.innerHTML = `<tr><td colspan="8">${UI.empty('Loading damage reports...')}</td></tr>`;
		try {
			const res = await window.API.damageReports();
			reports = UI.unwrap(res).items;
			updateStats();
			render();
		} catch (error) {
			body.innerHTML = `<tr><td colspan="8">${UI.empty(`Unable to load damage reports: ${UI.escape(error.message)}`)}</td></tr>`;
		}
	}

	document.querySelector('[data-report-tabs]')?.addEventListener('click', event => {
		const btn = event.target.closest('[data-status]');
		if (!btn) return;
		activeStatus = btn.dataset.status;
		document.querySelectorAll('[data-status]').forEach(tab => tab.classList.toggle('active', tab === btn));
		render();
	});

	search?.addEventListener('input', render);

	body?.addEventListener('click', async event => {
		const resolveButton = event.target.closest('[data-resolve]');
		if (!resolveButton) {
			return;
		}
		if (!window.confirm('Resolve this report and return this car to available?')) {
			return;
		}
		resolveButton.disabled = true;
		try {
			await window.API.resolveDamage(resolveButton.dataset.resolve);
			UI.toast('Damage report resolved. Car is now available.');
			await load();
		} catch (error) {
			UI.toast(error.message || 'Unable to resolve report.');
			resolveButton.disabled = false;
		}
	});

	load();
})();
