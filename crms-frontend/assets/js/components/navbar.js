(() => {
	const mount = document.querySelector('[data-component="navbar"]');
	if (!mount) return;

	function render(user = {}) {
		const name = user.name || 'Admin';
		mount.className = 'app-topbar admin-topbar';
		mount.innerHTML = `
			<div>
				<div class="admin-top-kicker">Operations console</div>
				<div class="admin-top-title">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
			</div>
			<div class="topbar-meta">
				<span>Live fleet</span>
				<span>Admin access</span>
			</div>
			<div class="topbar-user">
				<div class="topbar-user-circle" title="${name}">${window.UIUtils?.initials?.(name) || 'AD'}</div>
			</div>
		`;
	}

	async function boot() {
		const current = window.AppState?.get()?.currentUser;
		if (current) {
			render(current);
			return;
		}

		try {
			const response = await window.API.me();
			window.AppState?.setUser(response.data);
			if (response.data?.role !== 'admin') {
				window.location.replace('../customer/vehicles.html');
				return;
			}
			render(response.data);
		} catch {
			window.AppState?.clearUser();
			window.location.replace('../auth/login.html');
		}
	}

	boot();
})();
