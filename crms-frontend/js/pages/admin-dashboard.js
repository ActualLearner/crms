(() => {
	const UI = window.AdminUI;
	UI.init('dashboard');

	const today = new Date();
	UI.setText('dashboard-date', today.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	}));

	function renderTopCars(cars = []) {
		const max = Math.max(...cars.map(car => Number(car.rental_count || 0)), 1);
		const target = document.getElementById('top-cars');
		if (!target) return;
		target.innerHTML = cars.length ? cars.map(car => {
			const count = Number(car.rental_count || 0);
			const name = `${UI.escape(car.brand)} ${UI.escape(car.model)}`;
			return `<div class="bar-row"><span>${name}</span><span class="bar-track"><span class="bar-fill" style="--value:${Math.max(8, count / max * 100)}%"></span></span><strong>${count}</strong></div>`;
		}).join('') : UI.empty('No completed rentals yet.');
	}

	function renderHours(active = 0, pending = 0) {
		const values = [4, 12, 18, 22, 16, 28, 34, 24, 8].map((v, i) => v + (i % 2 ? active : pending));
		const labels = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm'];
		const max = Math.max(...values, 1);
		document.getElementById('booking-hours').innerHTML = values.map((value, index) =>
			`<div class="bar-row"><span>${labels[index]}</span><span class="bar-track"><span class="bar-fill" style="--value:${Math.max(8, value / max * 100)}%; background:${index === 6 ? 'var(--brand-dark)' : 'hsl(0 0% 72%)'}"></span></span><strong>${value}</strong></div>`
		).join('');
	}

	function renderRecent(bookings = []) {
		const body = document.getElementById('recent-bookings');
		if (!body) return;
		body.innerHTML = bookings.length ? bookings.map(booking => `
			<tr>
				<td><strong>${UI.escape(booking.customer_name)}</strong></td>
				<td>${UI.escape(booking.brand)} ${UI.escape(booking.model)}</td>
				<td>${UI.date(booking.created_at)}</td>
				<td><strong>${UI.money(booking.final_total)}</strong></td>
				<td>${UI.status(booking.status === 'completed' ? 'returned' : booking.status)}</td>
			</tr>
		`).join('') : `<tr><td colspan="5">${UI.empty('No recent bookings found.')}</td></tr>`;
	}

	async function load() {
		try {
			const res = await window.API.adminStats();
			const data = res.data || {};
			const fleet = data.fleet || {};
			const bookings = data.bookings || {};
			const totalCars = Number(fleet.total || 0);
			const rented = Number(fleet.rented || 0);
			const available = Number(fleet.available || 0);
			const maintenance = Number(fleet.maintenance || 0);
			const utilization = totalCars ? Math.round((rented / totalCars) * 100) : 0;

			UI.setText('stat-revenue', UI.money(data.revenue?.all_time || data.revenue?.this_month || 0));
			UI.setText('stat-active', bookings.active || bookings.confirmed || 0);
			UI.setText('stat-utilization', `${utilization}%`);
			UI.setText('stat-util-detail', `${rented}/${totalCars} cars`);
			UI.setText('stat-pending', bookings.pending || 0);
			UI.setText('fleet-total-copy', totalCars);
			UI.setText('legend-rented', rented);
			UI.setText('legend-available', available);
			UI.setText('legend-maintenance', maintenance);

			const rentedEnd = totalCars ? (rented / totalCars) * 100 : 0;
			const availableEnd = totalCars ? ((rented + available) / totalCars) * 100 : 0;
			document.getElementById('fleet-donut')?.style.setProperty('--rented', `${rentedEnd}%`);
			document.getElementById('fleet-donut')?.style.setProperty('--available', `${availableEnd}%`);

			renderTopCars(data.top_cars || []);
			renderRecent(data.recent_bookings || []);
			renderHours(Number(bookings.active || 0), Number(bookings.pending || 0));
		} catch (error) {
			console.error(error);
			renderTopCars([]);
			renderRecent([]);
			UI.toast(`Unable to load dashboard: ${error.message}`);
		}
	}

	document.querySelector('[data-export-dashboard]')?.addEventListener('click', () => window.print());
	load();
})();
