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
		showMessage,
		formatDate,
		formatMoney,
		initials,
	};
})();
