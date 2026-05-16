(() => {
    let fleet = [];
    let editingCarId = null;
    let editingCarImageUrl = '';

    const API_BASE = 'http://localhost:8082';
    const placeholder = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23e5e5e5%22 width=%22400%22 height=%22300%22/%3E%3Cpath d=%22M80 200 L100 150 L160 140 L240 140 L300 150 L320 200 Z%22 fill=%22%23d0d0d0%22/%3E%3Ccircle cx=%22130%22 cy=%22200%22 r=%2224%22 fill=%22%23aaa%22/%3E%3Ccircle cx=%22270%22 cy=%22200%22 r=%2224%22 fill=%22%23aaa%22/%3E%3Ctext x=%22200%22 y=%22260%22 font-size=%2214%22 fill=%22%23888%22 text-anchor=%22middle%22 font-family=%22sans-serif%22%3ENo image%3C/text%3E%3C/svg%3E';

    function imageSrc(imageUrl) {
        if (!imageUrl) return placeholder;
        if (window.API?.resolveUrl) return window.API.resolveUrl(imageUrl);
        if (imageUrl.startsWith('http')) return imageUrl;
        return API_BASE + (imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`);
    }

    function getCarById(id) {
        return fleet.find(car => String(car.id) === String(id));
    }

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        })[char]);
    }

    function money(value) {
        const amount = Number(value || 0);
        return `$${amount.toFixed(2)}`;
    }

    function detailValue(value, fallback = 'Not set') {
        return escapeHtml(value || fallback);
    }

    // ── Data loading ────────────────────────────────────────────
    async function loadFleet() {
        try {
            const res = await window.API.cars();
            if (res && res.success) {
                fleet = Array.isArray(res.data) ? res.data : (res.data.data || []);
                updateStats();

                const activeStatus = document.querySelector('.segmented.compact input:checked')?.value || 'all';
                const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
                filterFleet(activeStatus, searchTerm);
            }
        } catch (e) {
            console.error('Error loading fleet', e);
        }
    }

    function updateStats() {
        const total = fleet.length;
        const available = fleet.filter(c => c.status === 'available').length;
        const rented = fleet.filter(c => c.status === 'rented').length;
        const maintenance = fleet.filter(c => c.status === 'maintenance').length;

        setText('stat-total', total);
        setText('stat-total-head', total);
        setText('stat-available', available);
        setText('stat-rented', rented);
        setText('stat-maintenance', maintenance);
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function resetVehicleImagePreview() {
        const imagePreviewArea = document.getElementById('image-preview-area');
        const imageUploadPrompt = document.getElementById('image-upload-prompt');
        const imagePreview = document.getElementById('image-preview');
        const vehicleImageInput = document.getElementById('vehicle-image');

        if (imagePreviewArea) imagePreviewArea.style.display = 'none';
        if (imageUploadPrompt) imageUploadPrompt.style.display = 'flex';
        if (imagePreview) imagePreview.removeAttribute('src');
        if (vehicleImageInput) vehicleImageInput.value = '';
    }

    function showVehicleImagePreview(url) {
        const imagePreviewArea = document.getElementById('image-preview-area');
        const imageUploadPrompt = document.getElementById('image-upload-prompt');
        const imagePreview = document.getElementById('image-preview');

        if (!url) {
            resetVehicleImagePreview();
            return;
        }

        if (imagePreview) imagePreview.src = imageSrc(url);
        if (imagePreviewArea) imagePreviewArea.style.display = 'block';
        if (imageUploadPrompt) imageUploadPrompt.style.display = 'none';
    }

    function setVehicleModalMode(mode, car = null) {
        const modalTitle = document.getElementById('vehicle-modal-title');
        const submitBtn = document.getElementById('vehicle-submit-btn');
        const vehicleIdInput = document.getElementById('vehicle-id');
        const form = document.getElementById('add-vehicle-form');

        if (!modalTitle || !submitBtn || !vehicleIdInput || !form) return;

        if (mode === 'edit' && car) {
            editingCarId = car.id;
            editingCarImageUrl = car.image_url || '';
            modalTitle.textContent = 'Edit vehicle';
            submitBtn.textContent = 'Save changes';
            vehicleIdInput.value = car.id;

            form.elements.make.value = car.brand || '';
            form.elements.model.value = car.model || '';
            form.elements.year.value = car.year || '';
            form.elements.category.value = car.category || 'Sedan';
            form.elements.price_per_day.value = car.daily_rate ?? '';
            form.elements.horsepower.value = car.horsepower ?? '';
            form.elements.transmission.value = String(car.transmission || 'auto').toLowerCase() === 'manual' ? 'Manual' : 'Automatic';
            form.elements.drive_type.value = car.drive_type || 'AWD';
            form.elements.spec_line.value = car.spec_line || '';
            form.elements.seats.value = car.seats || 5;
            form.elements.penalty_rate.value = car.penalty_rate ?? 0;
            form.elements.description.value = car.description || '';

            resetVehicleImagePreview();
            if (editingCarImageUrl) showVehicleImagePreview(editingCarImageUrl);
        } else {
            editingCarId = null;
            editingCarImageUrl = '';
            modalTitle.textContent = 'Add vehicle';
            submitBtn.textContent = 'Add vehicle';
            vehicleIdInput.value = '';
            form.reset();
            form.elements.transmission.value = 'Automatic';
            form.elements.category.value = 'Sedan';
            form.elements.drive_type.value = 'AWD';
            resetVehicleImagePreview();
        }
    }

    function openVehicleModal(mode, car = null) {
        setVehicleModalMode(mode, car);
        document.getElementById('add-vehicle-modal')?.showModal();
    }

    function openDetailModal(car) {
        const detailModal = document.getElementById('vehicle-detail-modal');
        const detailBody = document.querySelector('[data-detail-body]');
        if (!detailModal || !detailBody || !car) return;

        const name = `${escapeHtml(car.brand || '')} ${escapeHtml(car.model || '')}`.trim() || 'Vehicle';
        const status = escapeHtml(car.status || 'available');
        const subtitle = `${escapeHtml(car.year || '—')} · ${escapeHtml(car.category || 'Vehicle')}`;
        const transmission = String(car.transmission || '').toLowerCase() === 'manual' ? 'Manual' : 'Automatic';

        detailBody.innerHTML = `
            <div class="vehicle-detail-header">
                <div class="vehicle-detail-media">
                    <img src="${escapeHtml(imageSrc(car.image_url))}" alt="${name}" loading="lazy">
                </div>
                <div class="vehicle-detail-title">
                    <h2>${name}</h2>
                    <p>${subtitle}</p>
                    <span class="vehicle-detail-status ${status}">${status}</span>
                </div>
                <div class="vehicle-detail-actions">
                    <button class="btn-card-outline" type="button" data-detail-edit="${car.id}">Edit</button>
                    <button class="modal-close-btn" type="button" data-detail-close aria-label="Close vehicle details">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
            <div class="vehicle-detail-grid" aria-label="Vehicle details">
                <div><span>Vehicle ID</span><strong>${detailValue(car.id)}</strong></div>
                <div><span>License Plate</span><strong>${detailValue(car.license_plate || car.plate_number || 'Unassigned')}</strong></div>
                <div><span>Daily Rate</span><strong>${money(car.daily_rate)} / day</strong></div>
                <div><span>Seats</span><strong>${detailValue(car.seats)}</strong></div>
                <div><span>Transmission</span><strong>${transmission}</strong></div>
                <div><span>Drive Type</span><strong>${detailValue(car.drive_type || 'AWD')}</strong></div>
                <div><span>Penalty Rate</span><strong>${money(car.penalty_rate)} / day</strong></div>
                <div><span>Next Service</span><strong>${detailValue(car.next_service || car.updated_at || 'Schedule review')}</strong></div>
            </div>
            ${car.description ? `<p class="vehicle-detail-description">${escapeHtml(car.description)}</p>` : ''}
        `;

        detailModal.showModal();
    }

    // ── Rendering ───────────────────────────────────────────────
    function renderGrid(cars) {
        const grid = document.getElementById('fleet-grid');
        if (!grid) return;

        if (cars.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>No vehicles found.</p></div>';
            return;
        }
    
    grid.innerHTML = cars.map(car => {
            const statusCls = car.status === 'available'
                ? 'available'
                : car.status === 'maintenance'
                    ? 'maintenance'
                    : 'rented';

            const transmission = String(car.transmission || '').toLowerCase() === 'manual' ? 'Manual' : 'Auto';
            const year = car.year || '';
            const category = car.category || '';
            const seats = car.seats || '—';
            const rating = (Math.random() * 1 + 4).toFixed(1);
            const reviewCount = Math.floor(Math.random() * 500);
            const name = `${escapeHtml(car.brand || '')} ${escapeHtml(car.model || '')}`.trim();

            return `
<div class="vehicle-card">
  <div class="vehicle-media">
    <img src="${escapeHtml(imageSrc(car.image_url))}" alt="${name}" loading="lazy">
    <span class="card-badge ${statusCls}">${escapeHtml(car.status || 'available')}</span>
    <span class="card-seats">${escapeHtml(seats)} seats</span>
  </div>

  <div class="vehicle-body">
    <h2 class="vehicle-name">${name}</h2>

    <div class="vehicle-meta">
      ${year ? `<span>${escapeHtml(year)}</span><span class="dot"></span>` : ''}
      <span>${escapeHtml(category || 'Vehicle')}</span>
      <span class="dot"></span>
      <span>${transmission}</span>
      <span class="dot"></span>
      <span>${escapeHtml(car.status || 'available')}</span>
    </div>

    <div class="vehicle-rating">
      ★ ${rating} <span style="font-weight:400;color:var(--text-muted);">(${reviewCount})</span>
    </div>

        <div class="vehicle-footer">
            <div class="vehicle-price">${money(car.daily_rate)}<span>/ day</span></div>
            <div class="card-actions">
                <button class="btn-card-primary" type="button" data-view-id="${car.id}">View details</button>
            </div>
        </div>
  </div>
</div>`;
        }).join('');
    }

    // ── Filtering ───────────────────────────────────────────────
    function filterFleet(status, searchTerm) {
        let filtered = fleet;
        if (status !== 'all') {
            filtered = filtered.filter(c => c.status === status);
        }
        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.brand.toLowerCase().includes(searchTerm) ||
                c.model.toLowerCase().includes(searchTerm) ||
                (c.year && c.year.toString().includes(searchTerm))
            );
        }
        renderGrid(filtered);
    }

    // ── Boot ────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        window.AdminUI?.init('fleet');
        loadFleet();

        const addVehicleModal = document.getElementById('add-vehicle-modal');
        const addVehicleBtn = document.getElementById('add-vehicle-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const addVehicleForm = document.getElementById('add-vehicle-form');
        const vehicleImageInput = document.getElementById('vehicle-image');
        const imagePreviewArea = document.getElementById('image-preview-area');
        const imageUploadPrompt = document.getElementById('image-upload-prompt');
        const imagePreview = document.getElementById('image-preview');
        const changeImageBtn = document.getElementById('change-image-btn');
        const vehicleModalTitle = document.getElementById('vehicle-modal-title');
        const vehicleSubmitBtn = document.getElementById('vehicle-submit-btn');
        const vehicleIdInput = document.getElementById('vehicle-id');

        // Logout
        const logoutBtn = document.querySelector('[data-logout]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try { await window.API.logout(); } finally {
                    window.location.replace('../auth/login.html');
                }
            });
        }

        // Status filter
        document.querySelectorAll('input[name="fleet_status"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const status = e.target.value;
                const searchTerm = document.getElementById('search-input').value.toLowerCase();
                filterFleet(status, searchTerm);
            });
        });

        // Search
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            const status = document.querySelector('input[name="fleet_status"]:checked')?.value || 'all';
            const searchTerm = e.target.value.toLowerCase();
            filterFleet(status, searchTerm);
        });

        // Add / edit modal
        if (addVehicleBtn && addVehicleModal) {
            addVehicleBtn.addEventListener('click', () => {
                setVehicleModalMode('add');
                addVehicleModal.showModal();
            });
        }
        if (closeModalBtn && addVehicleModal) {
            closeModalBtn.addEventListener('click', () => addVehicleModal.close());
        }

        addVehicleModal?.addEventListener('close', () => {
            editingCarId = null;
            editingCarImageUrl = '';
            if (vehicleIdInput) vehicleIdInput.value = '';
            if (vehicleModalTitle) vehicleModalTitle.textContent = 'Add vehicle';
            if (vehicleSubmitBtn) vehicleSubmitBtn.textContent = 'Add vehicle';
            if (addVehicleForm) {
                addVehicleForm.reset();
                addVehicleForm.elements.transmission.value = 'Automatic';
                addVehicleForm.elements.category.value = 'Sedan';
                addVehicleForm.elements.drive_type.value = 'AWD';
            }
            resetVehicleImagePreview();
        });

        // Image preview & drag-drop
        if (vehicleImageInput) {
            vehicleImageInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (imagePreview) imagePreview.src = ev.target.result;
                        if (imagePreviewArea) imagePreviewArea.style.display = 'block';
                        if (imageUploadPrompt) imageUploadPrompt.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });

            const uploadArea = vehicleImageInput.parentElement;
            ['dragenter','dragover','dragleave','drop'].forEach(ev =>
                uploadArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));

            ['dragenter','dragover'].forEach(ev =>
                uploadArea.addEventListener(ev, () => uploadArea.style.background = 'hsl(0,0%,92%)'));
            ['dragleave','drop'].forEach(ev =>
                uploadArea.addEventListener(ev, () => uploadArea.style.background = ''));

            uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    vehicleImageInput.files = files;
                    vehicleImageInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        if (changeImageBtn && vehicleImageInput) {
            changeImageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                vehicleImageInput.click();
            });
        }

        document.getElementById('vehicle-detail-modal')?.addEventListener('click', (e) => {
            if (e.target.closest('[data-detail-close]')) {
                document.getElementById('vehicle-detail-modal')?.close();
                return;
            }

            const editButton = e.target.closest('[data-detail-edit]');
            if (!editButton) return;
            const car = getCarById(editButton.dataset.detailEdit);
            document.getElementById('vehicle-detail-modal')?.close();
            if (car) openVehicleModal('edit', car);
        });

        // Card actions
        document.getElementById('fleet-grid')?.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('[data-view-id]');
            const manageBtn = e.target.closest('[data-manage-id]');
            if (viewBtn) {
                    const car = getCarById(viewBtn.dataset.viewId);
                    if (car) {
                        // Navigate to a dedicated details page instead of opening modal
                        window.location.href = `../admin/car-detail.html?id=${encodeURIComponent(car.id)}`;
                    }
                    return;
                }
            if (manageBtn) {
                const car = getCarById(manageBtn.dataset.manageId);
                if (car) openVehicleModal('edit', car);
            }
        });

        // Form submit
        if (addVehicleForm) {
            addVehicleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(addVehicleForm);
                const imageFile = formData.get('image');
                const isEditing = Boolean(vehicleIdInput?.value);
                let imageUrl = isEditing ? editingCarImageUrl : '';
                const hasSelectedImage = imageFile && imageFile.size > 0 && imageFile.name;

                try {
                    if (hasSelectedImage) {
                        if (!imageFile.type.startsWith('image/')) {
                            window.AdminUI?.toast('Please select a valid image file (JPEG, PNG, or WebP)');
                            return;
                        }
                        if (imageFile.size > 10 * 1024 * 1024) {
                            window.AdminUI?.toast('Image file must be smaller than 10 MB');
                            return;
                        }
                        try {
                            const imgUploadRes = await window.API.uploadImage(imageFile, 'car');
                            if (imgUploadRes && imgUploadRes.success) imageUrl = imgUploadRes.data.url;
                        } catch (uploadError) {
                            window.AdminUI?.toast('Failed to upload image: ' + (uploadError.message || 'Unknown error'));
                            return;
                        }
                    }

                    const rawTransmission = formData.get('transmission') || 'Automatic';

                    const carData = {
                        brand: formData.get('make'),
                        model: formData.get('model'),
                        year: formData.get('year'),
                        category: formData.get('category') || 'Sedan',
                        seats: parseInt(formData.get('seats')) || 5,
                        transmission: rawTransmission.toLowerCase() === 'manual' ? 'manual' : 'auto',
                        daily_rate: parseFloat(formData.get('price_per_day')) || 0,
                        penalty_rate: parseFloat(formData.get('penalty_rate')) || 0,
                        description: formData.get('description') || '',
                        image_url: imageUrl
                    };

                    const response = isEditing
                        ? await window.API.updateCar(vehicleIdInput.value, carData)
                        : await window.API.addCar(carData);

                    if (response.success) {
                        addVehicleModal.close();
                        loadFleet();
                    } else {
                        window.AdminUI?.toast('Failed to save car: ' + response.message);
                    }
                } catch (error) {
                    console.error('Error submitting form:', error);
                    window.AdminUI?.toast(error?.message || 'An unexpected error occurred. Please try again.');
                }
            });
        }
    });
})();
