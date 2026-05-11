(() => {
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
})();
