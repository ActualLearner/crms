(() => {
	function ensureWaitlistNavItem() {
		const nav = document.querySelector('.customer-nav');
		if (!nav) {
			return;
		}

		const currentPage = window.location.pathname.split('/').pop() || '';
		const existing = nav.querySelector('a[href$="waitlist-notifications.html"]');
		if (existing) {
			const isActive = currentPage === 'waitlist-notifications.html';
			existing.classList.toggle('active', isActive);
			if (isActive) {
				existing.setAttribute('aria-current', 'page');
			} else {
				existing.removeAttribute('aria-current');
			}
			return;
		}

		const waitlistItem = document.createElement('a');
		waitlistItem.className = 'nav-item';
		waitlistItem.href = './waitlist-notifications.html';
		if (currentPage === 'waitlist-notifications.html') {
			waitlistItem.classList.add('active');
			waitlistItem.setAttribute('aria-current', 'page');
		}
		waitlistItem.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg><span>Waitlist</span>';

		const profileLink = nav.querySelector('a[href$="profile.html"]');
		if (profileLink) {
			nav.insertBefore(waitlistItem, profileLink);
		} else {
			nav.appendChild(waitlistItem);
		}
	}

	function showMessage(target, message, type = 'info') {
		if (!target) {
			return;
		}
		target.textContent = message;
		target.style.color = type === 'error' ? 'hsl(0 55% 36%)' : 'hsl(220 8% 28%)';
	}

	function formatDate(value) {
		try {
			return new Date(value).toLocaleDateString();
		} catch {
			return value;
		}
	}

	function formatMoney(amount) {
		const numericAmount = Number(amount ?? 0);
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 2,
		}).format(numericAmount);
	}

	function initials(name = '') {
		return name
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('');
	}

	function escapeForHtml(value = '') {
		return String(value).replace(/[&<>"']/g, (char) => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		})[char]);
	}

	function toast(message, type = 'info') {
		if (!message) {
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
		item.className = `toast-message ${type}`;
		item.setAttribute('role', type === 'error' ? 'alert' : 'status');
		item.textContent = message;
		stack.appendChild(item);

		requestAnimationFrame(() => item.classList.add('is-visible'));
		setTimeout(() => {
			item.classList.remove('is-visible');
			item.addEventListener('transitionend', () => item.remove(), { once: true });
		}, 3600);
	}

	function ask(message, options = {}) {
		return new Promise((resolve) => {
			const backdrop = document.createElement('div');
			backdrop.className = 'confirm-backdrop';
			backdrop.innerHTML = `
				<section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
					<header>
						<h2 id="confirm-title">${escapeForHtml(options.title || 'Confirm action')}</h2>
						<p>${escapeForHtml(message)}</p>
					</header>
					<footer>
						<button class="confirm-cancel" type="button">${escapeForHtml(options.cancelText || 'Cancel')}</button>
						<button class="confirm-action" type="button">${escapeForHtml(options.confirmText || 'Continue')}</button>
					</footer>
				</section>
			`;

			const cleanup = (value) => {
				document.removeEventListener('keydown', onKeydown);
				backdrop.remove();
				resolve(value);
			};
			const onKeydown = (event) => {
				if (event.key === 'Escape') {
					cleanup(false);
				}
			};

			backdrop.querySelector('.confirm-cancel').addEventListener('click', () => cleanup(false));
			backdrop.querySelector('.confirm-action').addEventListener('click', () => cleanup(true));
			backdrop.addEventListener('click', (event) => {
				if (event.target === backdrop) {
					cleanup(false);
				}
			});
			document.addEventListener('keydown', onKeydown);
			document.body.appendChild(backdrop);
			backdrop.querySelector('.confirm-action').focus();
		});
	}

	window.UIUtils = {
                showNotificationBanner(message) {
                        toast(message, 'success');
                },
		showMessage,
		toast,
		ask,
		formatDate,
		formatMoney,
		initials,
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', ensureWaitlistNavItem);
	} else {
		ensureWaitlistNavItem();
	}
})();
