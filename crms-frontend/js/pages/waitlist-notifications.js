(() => {
	const F = window.CustomerFlow;
	const notifications = document.querySelector('[data-notifications]');
	const markRead = document.querySelector('[data-mark-read]');
	let waitlistCars = [];

	function icon(type) {
		const paths = {
			available: '<path d="M5 17h14l-1.3-5.2A3 3 0 0 0 14.8 9H9.2a3 3 0 0 0-2.9 2.8L5 17Z"></path><path d="M7 17v2"></path><path d="M17 17v2"></path>',
			waiting: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path>',
			info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8h.01"></path><path d="M11 12h1v4h1"></path>',
		};
		return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type] || paths.info}</svg>`;
	}

	function todayLabel() {
		return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
	}

	function render(user) {
		const rows = [];
		if (user?.has_notification) {
			rows.push({
				type: 'available',
				title: 'Vehicle available',
				copy: `${user.notification_car} is ready for booking.`,
				date: todayLabel(),
				unread: true,
			});
		}

		waitlistCars.forEach((car) => {
			const available = car.status === 'available' || Number(car.notified) === 1;
			rows.push({
				type: available ? 'available' : 'waiting',
				title: available ? 'Vehicle available' : 'Waitlist active',
				copy: available
					? `${car.brand} ${car.model} is available now.`
					: `${car.brand} ${car.model} is still being watched for you.`,
				date: available ? todayLabel() : F.escapeHtml(car.status || 'Waiting'),
				car,
				unread: available,
			});
		});

		if (!rows.length) {
			rows.push({
				type: 'info',
				title: 'Welcome to Auto Ultimate',
				copy: 'Join a vehicle waitlist and updates will appear here.',
				date: todayLabel(),
			});
		}

		notifications.innerHTML = rows.map((row) => `
			<article class="notification-row ${row.unread ? 'unread' : ''}">
				<span class="notification-icon">${icon(row.type)}</span>
				<div class="notification-copy">
					<strong>${F.escapeHtml(row.title)}</strong>
					<p>${F.escapeHtml(row.copy)}</p>
					${row.car ? `<div class="notification-actions">${row.type === 'available' ? `<a class="flow-button primary" href="./car-detail.html?id=${row.car.car_id}&book=1">Book now</a>` : ''}<button class="flow-button danger" type="button" data-leave="${row.car.car_id}">Leave</button></div>` : ''}
				</div>
				<div class="notification-meta">
					<span>${F.escapeHtml(row.date)}</span>
					${row.unread ? '<i aria-label="Unread"></i>' : ''}
				</div>
			</article>
		`).join('');
	}

	async function init() {
		const user = await F.requireUser();
		if (!user) return;
		F.logout();
		try {
			const res = await window.API.waitlistMine();
			waitlistCars = res.data || [];
		} catch (error) {
			notifications.innerHTML = `<div class="flow-alert danger">${F.escapeHtml(error.message || 'Unable to load notifications.')}</div>`;
			return;
		}
		render(user);
	}

	notifications?.addEventListener('click', async event => {
		const leave = event.target.closest('[data-leave]');
		if (!leave) return;
		leave.disabled = true;
		try {
			await window.API.leaveWaitlist(leave.dataset.leave);
			await init();
		} catch (error) {
			window.UIUtils?.toast(error.message || 'Unable to update waitlist.', 'error');
			leave.disabled = false;
		}
	});

	markRead?.addEventListener('click', () => {
		document.querySelectorAll('.notification-row.unread').forEach(row => row.classList.remove('unread'));
		document.querySelectorAll('.notification-meta i').forEach(dot => dot.remove());
		window.UIUtils?.toast('Notifications marked as read.', 'success');
	});

	init();
})();
