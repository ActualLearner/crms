(() => {
	const mount = document.querySelector('[data-component="sidebar"]');
	if (!mount) return;

	const page = document.querySelector('.app-shell')?.dataset.page || '';
	const links = [
		{ id: 'admin-dashboard', label: 'Dashboard', href: './dashboard.html', icon: 'M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z' },
		{ id: 'admin-bookings', label: 'Bookings', href: './bookings.html', icon: 'M7 3v3M17 3v3M4 9h16M5 5h14v16H5z' },
		{ id: 'admin-fleet', label: 'Fleet', href: './fleet.html', icon: 'M5 16h14l-1.5-5h-11L5 16Zm1.5 0v3M17.5 16v3M7 11l1.2-4h7.6L17 11' },
		{ id: 'admin-customers', label: 'Customers', href: './customers.html', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
		{ id: 'admin-promos', label: 'Promos', href: './promos.html', icon: 'M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z' },
	];

	mount.className = 'customer-nav admin-sidebar';
	mount.innerHTML = `
		<div class="admin-side-brand">
			<span class="admin-mark">C</span>
			<span>CRMS</span>
		</div>
		${links.map((item) => `
			<a class="nav-item ${page === item.id ? 'active' : ''}" href="${item.href}">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${item.icon}"></path></svg>
				<span>${item.label}</span>
			</a>
		`).join('')}
		<button class="nav-item nav-button" type="button" data-admin-logout>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"></path></svg>
			<span>Logout</span>
		</button>
	`;

	mount.querySelector('[data-admin-logout]')?.addEventListener('click', async () => {
		try {
			await window.API.logout();
		} catch {
			/* best effort */
		}
		window.AppState?.clearUser();
		window.location.replace('../auth/login.html');
	});
})();
