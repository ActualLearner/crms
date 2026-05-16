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

	function imageSrc(url) {
		return window.API?.resolveUrl?.(url) || '';
	}

	function renderVehicles(cars = []) {
		const target = document.getElementById('dashboard-vehicles');
		if (!target) return;

		target.innerHTML = cars.length ? cars.slice(0, 4).map(car => {
			const name = `${UI.escape(car.brand || '')} ${UI.escape(car.model || '')}`.trim() || 'Vehicle';
			const img = imageSrc(car.image_url);
			return `
				<a class="dashboard-vehicle-row" href="./fleet.html" aria-label="Open ${name}">
					<span class="dashboard-thumb">${img ? `<img src="${UI.escape(img)}" alt="${name}" loading="lazy">` : ''}</span>
					<span><strong>${name}</strong><small>${UI.escape(car.year || '—')} · ${UI.escape(car.category || 'Vehicle')}</small></span>
					<em>${UI.escape(car.status || 'available')}</em>
				</a>`;
		}).join('') : UI.empty('No vehicles found.');
	}

	function renderRecent(bookings = []) {
		const target = document.getElementById('recent-bookings');
		if (!target) return;

		target.innerHTML = bookings.length ? bookings.slice(0, 4).map(booking => `
			<a class="dashboard-booking-row" href="./bookings.html">
				<span class="dashboard-note-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h4"></path></svg></span>
				<span><strong>${UI.escape(booking.customer_name || 'Customer')}</strong><small>${UI.escape(booking.brand || '')} ${UI.escape(booking.model || '')} · ${UI.date(booking.created_at)}</small></span>
				<em>${UI.money(booking.final_total)}</em>
			</a>
		`).join('') : UI.empty('No recent bookings found.');
	}

	async function load() {
		try {
			const [res, carsRes] = await Promise.all([
				window.API.adminStats(),
				window.API.cars().catch(() => ({ data: [] })),
			]);
			const data = res.data || {};
			const fleet = data.fleet || {};
			const bookings = data.bookings || {};
			const carsPayload = carsRes.data || [];
			const cars = Array.isArray(carsPayload) ? carsPayload : (carsPayload.data || []);

			UI.setText('stat-vehicles', Number(fleet.total || 0) || cars.length || 0);
			UI.setText('stat-revenue', UI.money(data.revenue?.all_time || data.revenue?.this_month || 0));
			UI.setText('stat-active', bookings.active || bookings.confirmed || 0);
			UI.setText('stat-pending', bookings.pending || 0);

			renderVehicles(cars.length ? cars : (data.top_cars || []));
			renderRecent(data.recent_bookings || []);
		} catch (error) {
			console.error(error);
			renderVehicles([]);
			renderRecent([]);
			UI.toast(`Unable to load dashboard: ${error.message}`);
		}
	}

	document.querySelector('[data-export-dashboard]')?.addEventListener('click', () => window.print());
	load();
})();
