(() => {
	const state = {
		currentUser: null,
		isAuthenticated: false,
	};

	window.AppState = {
		get() {
			return { ...state };
		},
		setUser(user) {
			state.currentUser = user;
			state.isAuthenticated = !!user;
		},
		clearUser() {
			state.currentUser = null;
			state.isAuthenticated = false;
		},
	};
})();
