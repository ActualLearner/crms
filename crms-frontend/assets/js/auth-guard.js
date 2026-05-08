(() => {
	function getAuthenticatedRedirect(user) {
		return user?.role === 'admin' ? '../admin/dashboard.html' : '../customer/vehicles.html';
	}

	async function redirectAuthenticatedUser() {
		try {
			const response = await window.API.me();
			const user = response.data;

			if (!user) {
				return;
			}

			window.AppState?.setUser(user);
			window.location.replace(getAuthenticatedRedirect(user));
		} catch (error) {
			window.AppState?.clearUser();
		}
	}

	window.AuthGuard = {
		redirectAuthenticatedUser,
		getAuthenticatedRedirect,
	};
})();
