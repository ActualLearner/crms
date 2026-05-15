(() => {
	const F = window.CustomerFlow;
	const notifications = document.querySelector('[data-notifications]');
	const waitlistCars = document.querySelector('[data-waitlist-cars]');

	function renderNotifications(user) {
		if (user?.has_notification) {
			notifications.innerHTML = `
				<article class="notification-item">
					<div class="notification-icon">!</div>
					<div>
						<strong>${F.escapeHtml(user.notification_car)}</strong>
						<p class="flow-muted">Open the fleet to book it before someone else does.</p>
					</div>
				</article>`;
			return;
		}
		notifications.innerHTML = `
			<article class="notification-item">
				<div class="notification-icon">i</div>
				<div>
					<strong>No availability alerts right now</strong>
					<p class="flow-muted">When a watched car becomes available, it will show here.</p>
				</div>
			</article>`;
	}

	function renderCars(cars) {
		const unavailable = cars.filter(car => car.status !== 'available');
		if (!unavailable.length) {
			waitlistCars.innerHTML = '<div class="flow-alert">No saved unavailable cars. Save an unavailable vehicle or join from its detail page.</div>';
			return;
		}
		waitlistCars.innerHTML = unavailable.map(car => `
			<article class="waitlist-item">
				<div class="flow-thumb">${F.image(car)}</div>
				<div>
					<strong>${F.escapeHtml(car.brand)} ${F.escapeHtml(car.model)}</strong>
					<p class="flow-muted">${F.escapeHtml(car.category || 'Vehicle')} · ${F.money(car.daily_rate)} / day</p>
				</div>
				<div class="flow-actions">
					<button class="flow-button primary" type="button" data-join="${car.id}">Join</button>
					<button class="flow-button danger" type="button" data-leave="${car.id}">Leave</button>
				</div>
			</article>
		`).join('');
	}

	async function init() {
		const user = await F.requireUser();
		if (!user) return;
		F.logout();
		renderNotifications(user);
		try {
			const res = await window.API.waitlistMine();
			renderCars(res.data || []);
		} catch (error) {
			waitlistCars.innerHTML = `<div class="flow-alert danger">${F.escapeHtml(error.message || 'Unable to load saved cars.')}</div>`;
		}
	}

	waitlistCars?.addEventListener('click', async event => {
		const join = event.target.closest('[data-join]');
		const leave = event.target.closest('[data-leave]');
		const btn = join || leave;
		if (!btn) return;
		btn.disabled = true;
		try {
			if (join) {
				await window.API.joinWaitlist(join.dataset.join);
				btn.textContent = 'Joined';
			} else {
				await window.API.leaveWaitlist(leave.dataset.leave);
				btn.textContent = 'Left';
			}
			await init();
		} catch (error) {
			window.alert(error.message || 'Unable to update waitlist.');
			btn.disabled = false;
		}
	});

	init();
})();
