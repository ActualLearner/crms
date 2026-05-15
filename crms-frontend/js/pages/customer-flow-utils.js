window.CustomerFlow = (() => {
	function escapeHtml(value = '') {
		return String(value).replace(/[&<>"']/g, (char) => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		})[char]);
	}

	function date(value) {
		if (!value) return '—';
		return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
	}

	function days(start, end) {
		const s = new Date(`${String(start).slice(0, 10)}T00:00:00`);
		const e = new Date(`${String(end).slice(0, 10)}T00:00:00`);
		if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
		return Math.max(1, Math.ceil((e - s) / 86400000));
	}

	function money(value) {
		return window.UIUtils?.formatMoney ? window.UIUtils.formatMoney(value) : `$${Number(value || 0).toFixed(2)}`;
	}

	function status(status) {
		const cls = ['active', 'completed', 'available'].includes(status) ? 'success' : ['pending', 'confirmed'].includes(status) ? 'warning' : status === 'cancelled' ? 'danger' : '';
		const label = String(status || 'unknown').replace(/\b\w/g, c => c.toUpperCase());
		return `<span class="flow-pill ${cls}">${label}</span>`;
	}

	function image(item) {
		const url = window.API?.resolveUrl?.(item.image_url);
		if (url) return `<img src="${escapeHtml(url)}" alt="${escapeHtml(`${item.brand} ${item.model}`)}" />`;
		return '<div class="detail-fallback-car" aria-hidden="true"></div>';
	}

	function bookingStrip(booking, extra = '') {
		const name = `${booking.brand || ''} ${booking.model || ''}`.trim() || 'Vehicle';
		return `
			<div class="flow-car-strip">
				<div class="flow-thumb">${image(booking)}</div>
				<div>
					<h2>${escapeHtml(name)}</h2>
					<p class="flow-muted">${date(booking.start_date)} - ${date(booking.end_date)} · ${days(booking.start_date, booking.end_date)} days</p>
					<p class="flow-muted">${escapeHtml(booking.reference_number || '')}</p>
				</div>
				${status(booking.status)}
			</div>
			${extra}`;
	}

	async function requireUser() {
		try {
			const me = await window.API.me();
			window.AppState?.setUser(me.data);
			return me.data;
		} catch {
			window.location.replace('../auth/login.html');
			return null;
		}
	}

	function logout() {
		document.querySelector('[data-logout]')?.addEventListener('click', async () => {
			try { await window.API.logout(); } finally {
				window.AppState?.clearUser();
				window.location.replace('../auth/login.html');
			}
		});
	}

	return { escapeHtml, date, days, money, status, image, bookingStrip, requireUser, logout };
})();
