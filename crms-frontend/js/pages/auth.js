(() => {
	const form = document.querySelector('.auth-form');
	if (!form) {
		return;
	}

	const mode = form.dataset.authMode || 'login';
	const emailInput = form.querySelector('[name="email"]');
	const passwordInput = form.querySelector('[name="password"]');
	const passwordToggles = form.querySelectorAll('[data-password-toggle]');
	const passwordRules = form.querySelectorAll('[data-password-rule]');
	const submitButtonText = mode === 'register' ? 'Create account' : 'Sign in';
	const loadingText = mode === 'register' ? 'Creating account...' : 'Signing in...';
	const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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

	function setPasswordVisibility(input, toggle, isVisible) {
		if (!input || !toggle) {
			return;
		}

		input.type = isVisible ? 'text' : 'password';
		toggle.setAttribute('aria-pressed', String(isVisible));
		toggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');

		const visibleIcons = toggle.querySelectorAll('.password-toggle-visible');
		const hiddenIcons = toggle.querySelectorAll('.password-toggle-hidden');
		visibleIcons.forEach((node) => {
			node.style.display = isVisible ? 'none' : 'inline';
		});
		hiddenIcons.forEach((node) => {
			node.style.display = isVisible ? 'inline' : 'none';
		});
	}

	function redirectAfterLogin(user) {
		const redirectUrl = window.AuthGuard?.getAuthenticatedRedirect(user) || '../customer/vehicles.html';
		window.location.replace(redirectUrl);
	}

	passwordToggles.forEach((toggle) => {
		const targetId = toggle.dataset.target;
		const input = targetId ? form.querySelector(`#${CSS.escape(targetId)}`) : passwordInput;
		if (!input) {
			return;
		}

		setPasswordVisibility(input, toggle, false);
		toggle.addEventListener('click', () => {
			setPasswordVisibility(input, toggle, input.type === 'password');
			input.focus();
		});
	});

	function getPasswordRuleState(password = '') {
		return {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			symbol: /[^A-Za-z0-9]/.test(password),
		};
	}

	function updatePasswordChecklist() {
		if (!passwordRules.length || !passwordInput) {
			return;
		}

		const ruleState = getPasswordRuleState(passwordInput.value);
		passwordRules.forEach((rule) => {
			const isValid = Boolean(ruleState[rule.dataset.passwordRule]);
			rule.classList.toggle('is-valid', isValid);
			rule.setAttribute('aria-label', `${rule.textContent.trim()}: ${isValid ? 'fulfilled' : 'not fulfilled'}`);
		});
	}

	if (passwordInput && passwordRules.length) {
		updatePasswordChecklist();
		passwordInput.addEventListener('input', updatePasswordChecklist);
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

		if (!strongPasswordPattern.test(payload.password)) {
			return 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.';
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
		const rememberMe = form.querySelector('[name="remember"]')?.checked ?? false;


		if (!email || !password) {
			window.UIUtils?.showMessage(messageNode, 'Email and password are required.', 'error');
			return;
		}

		setLoading(true);
		window.UIUtils?.showMessage(messageNode, 'Signing in...');

		try {
			await window.API.login(email, password, rememberMe);
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
