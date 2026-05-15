(() => {
	const UI = window.AdminUI;
	UI.init('promos');
	let promos = [];
	let activeFilter = 'all';
	const grid = document.getElementById('promo-grid');
	const search = document.getElementById('promo-search');
	const modal = document.getElementById('promo-modal');
	const form = document.getElementById('promo-form');

	function state(promo) {
		const used = Number(promo.times_used || 0);
		const max = Number(promo.max_uses || 0);
		if (max && used >= max) return 'exhausted';
		return Number(promo.active) === 1 ? 'active' : 'inactive';
	}

	function updateStats() {
		UI.setText('promo-total', promos.length);
		UI.setText('promo-active', promos.filter(p => state(p) === 'active').length);
		UI.setText('promo-uses', promos.reduce((sum, p) => sum + Number(p.times_used || 0), 0));
		UI.setText('promo-savings', UI.money(promos.reduce((sum, p) => sum + (Number(p.times_used || 0) * Number(p.discount_percentage || 0) * 5), 0)));
	}

	function filtered() {
		const q = search.value.trim().toLowerCase();
		return promos.filter(promo => {
			const promoState = state(promo);
			const filterOk = activeFilter === 'all' || promoState === activeFilter || (activeFilter === 'inactive' && promoState === 'exhausted');
			return filterOk && (!q || String(promo.code).toLowerCase().includes(q));
		});
	}

	function render() {
		const rows = filtered();
		grid.innerHTML = rows.length ? rows.map(promo => {
			const used = Number(promo.times_used || 0);
			const max = Number(promo.max_uses || 1);
			const progress = Math.min(100, Math.round((used / max) * 100));
			const promoState = state(promo);
			return `
				<article class="promo-card">
					<div class="promo-head">
						<div><div class="promo-code">${UI.escape(promo.code)}</div><p class="tone-muted">Discount code</p></div>
						${UI.status(promoState)}
					</div>
					<div class="promo-offer"><strong>${Number(promo.discount_percentage || 0)}%</strong> <span class="tone-muted">off</span><p class="tone-muted">Expires ${UI.date(promo.valid_until)}</p></div>
					<div>
						<div class="legend-row"><span>Usage</span><span>${used} / ${max}</span></div>
						<div class="progress-track"><span class="progress-fill" style="--progress:${progress}%; --progress-color:${promoState === 'exhausted' ? 'hsl(0 54% 52%)' : 'var(--brand-dark)'}"></span></div>
					</div>
					<div class="admin-row-actions">
						<button class="admin-btn" data-copy="${UI.escape(promo.code)}">Copy code</button>
						<button class="admin-btn ${Number(promo.active) === 1 ? 'danger' : 'success'}" data-toggle="${promo.id}" data-active="${Number(promo.active) === 1 ? '0' : '1'}">${Number(promo.active) === 1 ? 'Deactivate' : 'Activate'}</button>
					</div>
				</article>`;
		}).join('') : UI.empty('No promo codes match those filters.');
	}

	async function load() {
		try {
			const res = await window.API.promos();
			promos = UI.unwrap(res).items;
			updateStats();
			render();
		} catch (error) {
			console.error(error);
			grid.innerHTML = UI.empty(`Unable to load promo codes: ${UI.escape(error.message)}`);
		}
	}

	document.querySelector('[data-promo-tabs]')?.addEventListener('click', event => {
		const btn = event.target.closest('[data-filter]');
		if (!btn) return;
		activeFilter = btn.dataset.filter;
		document.querySelectorAll('[data-filter]').forEach(tab => tab.classList.toggle('active', tab === btn));
		render();
	});

	search?.addEventListener('input', render);
	document.querySelector('[data-open-promo]')?.addEventListener('click', () => modal.showModal());
	document.querySelectorAll('[data-close-promo]').forEach(btn => btn.addEventListener('click', () => modal.close()));

	form?.addEventListener('submit', async event => {
		event.preventDefault();
		const data = Object.fromEntries(new FormData(form).entries());
		data.discount_percentage = Number(data.discount_percentage);
		data.max_uses = Number(data.max_uses);
		try {
			await window.API.createPromo(data);
			form.reset();
			modal.close();
			UI.toast('Promo code created');
			await load();
		} catch (error) {
			UI.toast(error.message);
		}
	});

	grid?.addEventListener('click', async event => {
		const copy = event.target.closest('[data-copy]');
		const toggle = event.target.closest('[data-toggle]');
		if (copy) {
			await navigator.clipboard?.writeText(copy.dataset.copy);
			UI.toast('Code copied');
		}
		if (toggle) {
			try {
				await window.API.updatePromo(toggle.dataset.toggle, { active: Number(toggle.dataset.active) });
				UI.toast('Promo updated');
				await load();
			} catch (error) {
				UI.toast(error.message);
			}
		}
	});
	load();
})();
