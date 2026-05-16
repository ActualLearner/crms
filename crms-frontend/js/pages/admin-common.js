window.AdminUI = (() => {
	const navItems = [
		['dashboard.html', 'Dashboard', 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z'],
		['bookings.html', 'Bookings', 'M7 3v3 M17 3v3 M4 8h16 M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2z'],
		['damage-reports.html', 'Damage reports', 'M4 6h16 M4 12h16 M4 18h10 M18 16l3 3 M21 19l-3 3'],
		['fleet.html', 'Fleet', 'M5 16h14l-1.4-5A3 3 0 0 0 14.7 9H9.3a3 3 0 0 0-2.9 2L5 16z M7 16v2 M17 16v2'],
		['customers.html', 'Customers', 'M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
		['promos.html', 'Promo codes', 'M19 5 5 19 M7 7h.01 M17 17h.01 M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
	];

	function icon(path) {
		return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
	}

	function init(page) {
		const shell = document.querySelector('.admin-shell');
		const nav = document.querySelector('[data-admin-nav]');
		if (nav) {
			nav.innerHTML = navItems.map(([href, label, path]) => {
				const active = href.includes(page) ? ' class="active"' : '';
				return `<a href="./${href}"${active}>${icon(path)}<span>${label}</span></a>`;
			}).join('');
		}
		document.querySelector('[data-admin-menu]')?.addEventListener('click', () => {
			shell?.classList.toggle('nav-open');
		});
		document.querySelector('[data-logout]')?.addEventListener('click', async () => {
			try { await window.API?.logout?.(); } finally { window.location.replace('../auth/login.html'); }
		});
	}

	function unwrap(payload) {
		const data = payload?.data;
		if (Array.isArray(data)) return { items: data, total: data.length };
		if (Array.isArray(data?.data)) return { items: data.data, total: data.total ?? data.data.length, meta: data };
		return { items: [], total: 0 };
	}

	function money(value) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
	}

	function date(value, opts = {}) {
		if (!value) return '—';
		const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: opts.year === false ? undefined : 'numeric' });
	}

	function initials(name = 'Admin') {
		return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AD';
	}

	function status(value) {
		const text = String(value || 'unknown').replace(/_/g, ' ');
		return `<span class="status-pill ${text.toLowerCase()}">${text.replace(/\b\w/g, c => c.toUpperCase())}</span>`;
	}

	function escape(value) {
		return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
	}

	function toast(message) {
		if (window.UIUtils?.toast) {
			window.UIUtils.toast(message);
			return;
		}
		let stack = document.querySelector('[data-toast-stack]');
		if (!stack) {
			stack = document.createElement('div');
			stack.className = 'toast-stack';
			stack.dataset.toastStack = '';
			document.body.appendChild(stack);
		}
		const item = document.createElement('div');
		item.className = 'toast-message is-visible';
		item.setAttribute('role', 'status');
		item.textContent = message;
		stack.appendChild(item);
		setTimeout(() => item.remove(), 3600);
	}

	function ask(message, options = {}) {
		if (window.UIUtils?.ask) return window.UIUtils.ask(message, options);
		return new Promise((resolve) => {
			const backdrop = document.createElement('div');
			backdrop.className = 'confirm-backdrop';
			backdrop.innerHTML = `
				<section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
					<header><h2 id="confirm-title">${escape(options.title || 'Confirm action')}</h2><p>${escape(message)}</p></header>
					<footer><button class="confirm-cancel" type="button">${escape(options.cancelText || 'Cancel')}</button><button class="confirm-action" type="button">${escape(options.confirmText || 'Continue')}</button></footer>
				</section>
			`;
			const cleanup = value => { backdrop.remove(); resolve(value); };
			backdrop.querySelector('.confirm-cancel').addEventListener('click', () => cleanup(false));
			backdrop.querySelector('.confirm-action').addEventListener('click', () => cleanup(true));
			document.body.appendChild(backdrop);
			backdrop.querySelector('.confirm-action').focus();
		});
	}

	function setText(id, value) {
		const el = document.getElementById(id);
		if (el) el.textContent = value;
	}

	function empty(label) {
		return `<div class="empty-state">${label}</div>`;
	}

	return { init, unwrap, money, date, initials, status, escape, toast, ask, setText, empty };
})();
