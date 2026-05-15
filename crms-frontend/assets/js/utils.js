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

	window.UIUtils = {
                showNotificationBanner(message) {
                        if (document.getElementById('crms-notification-banner')) return;
                        const banner = document.createElement('div');
                        banner.id = 'crms-notification-banner';
                        banner.style.cssText = 'background-color: var(--primary, #0056b3); color: white; padding: 12px 20px; text-align: center; position: sticky; top: 0; z-index: 9999; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: 500; display: flex; justify-content: center; align-items: center; gap: 10px;';
                        banner.innerHTML = `<span>🔔 ${message}</span> <button aria-label="Dismiss" style="background:none;border:none;color:white;cursor:pointer;font-size:1.2rem;line-height:1;">&times;</button>`;
                        banner.querySelector('button').addEventListener('click', () => banner.remove());
                        document.body.prepend(banner);
                },
		showMessage,
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
