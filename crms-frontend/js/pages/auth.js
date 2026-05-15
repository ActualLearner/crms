(() => {
	const form = document.querySelector('.auth-form');
	if (!form) {
		return;
	}

	const mode = form.dataset.authMode || 'login';
	const emailInput = form.querySelector('[name="email"]');
	const passwordInput = form.querySelector('[name="password"]');
	const passwordToggle = form.querySelector('[data-password-toggle]');
	const submitButtonText = mode === 'register' ? 'Create account' : 'Sign in';
	const loadingText = mode === 'register' ? 'Creating account...' : 'Signing in...';

	const messageNode = document.createElement('p');
	messageNode.setAttribute('aria-live', 'polite');
	messageNode.classList.add('field-full');
	messageNode.style.marginTop = '8px';
	messageNode.style.fontSize = '14px';
	form.appendChild(messageNode);

	function setLoading(isLoading) {
		const submitButton = form.querySelector('button[type="submit"]');
		if (!submitButton) {
			return;
		}
		submitButton.disabled = isLoading;
		submitButton.textContent = isLoading ? loadingText : submitButtonText;
	}

	function setPasswordVisibility(isVisible) {
		if (!passwordInput || !passwordToggle) {
			return;
		}

		passwordInput.type = isVisible ? 'text' : 'password';
		passwordToggle.setAttribute('aria-pressed', String(isVisible));
		passwordToggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');

		const visibleIcons = passwordToggle.querySelectorAll('.password-toggle-visible');
		const hiddenIcons = passwordToggle.querySelectorAll('.password-toggle-hidden');
		visibleIcons.forEach((node) => {
			node.style.display = isVisible ? 'none' : '';
		});
		hiddenIcons.forEach((node) => {
			node.style.display = isVisible ? '' : 'none';
		});
	}

	function redirectAfterLogin(user) {
		const redirectUrl = window.AuthGuard?.getAuthenticatedRedirect(user) || '../customer/vehicles.html';
		window.location.replace(redirectUrl);
	}

	if (passwordToggle && passwordInput) {
		setPasswordVisibility(false);
		passwordToggle.addEventListener('click', () => {
			setPasswordVisibility(passwordInput.type === 'password');
			passwordInput.focus();
		});
	}

	function getRegistrationPayload() {
		const formData = new FormData(form);
		return {
			name: formData.get('name')?.toString().trim() || '',
			email: formData.get('email')?.toString().trim() || '',
			phone: formData.get('phone')?.toString().trim() || '',
			license_number: formData.get('license_number')?.toString().trim() || '',
			password: formData.get('password')?.toString() || '',
			confirm_password: formData.get('confirm_password')?.toString() || '',
		};
	}

	function validateRegistration(payload) {
		if (!payload.name || !payload.email || !payload.phone || !payload.license_number || !payload.password) {
			return 'All fields are required.';
		}

		if (payload.password.length < 8) {
			return 'Password must be at least 8 characters.';
		}

		if (payload.password !== payload.confirm_password) {
			return 'Passwords do not match.';
		}

		return '';
	}

	async function submitRegistration() {
		const payload = getRegistrationPayload();
		const validationMessage = validateRegistration(payload);

		if (validationMessage) {
			window.UIUtils?.showMessage(messageNode, validationMessage, 'error');
			return;
		}

		setLoading(true);
		window.UIUtils?.showMessage(messageNode, 'Creating account...');

		try {
			const response = await window.API.register({
				name: payload.name,
				email: payload.email,
				phone: payload.phone,
				license_number: payload.license_number,
				password: payload.password,
			});
			window.AppState?.setUser(response.data);
			window.UIUtils?.showMessage(messageNode, 'Account created. Redirecting...');
			redirectAfterLogin(response.data);
		} catch (error) {
			window.AppState?.clearUser();
			window.UIUtils?.showMessage(messageNode, error.message || 'Unable to create account.', 'error');
		} finally {
			setLoading(false);
		}
	}

	async function submitLogin() {
		const email = emailInput?.value?.trim();
		const password = passwordInput?.value ?? '';

		if (!email || !password) {
			window.UIUtils?.showMessage(messageNode, 'Email and password are required.', 'error');
			return;
		}

		setLoading(true);
		window.UIUtils?.showMessage(messageNode, 'Signing in...');

		try {
			await window.API.login(email, password);
			const meResponse = await window.API.me();
			window.AppState?.setUser(meResponse.data);
			window.UIUtils?.showMessage(messageNode, 'Login successful. Redirecting...');
			redirectAfterLogin(meResponse.data);
		} catch (error) {
			window.AppState?.clearUser();
			window.UIUtils?.showMessage(messageNode, error.message || 'Unable to sign in.', 'error');
		} finally {
			setLoading(false);
		}
	}

	form.addEventListener('submit', async (event) => {
		event.preventDefault();

		if (mode === 'register') {
			await submitRegistration();
			return;
		}

		await submitLogin();
	});
})();
