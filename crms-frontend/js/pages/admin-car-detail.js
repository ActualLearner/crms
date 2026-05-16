/* ============================================================
   admin-car-detail.js
   Handles vehicle detail page: load, edit modal, delete,
   status change. Depends on window.API (api.js).
   ============================================================ */

(function () {
  'use strict';

  /* ── Tiny helpers ── */
  const qs  = (s) => document.querySelector(s);
  const fmt = (n) => Number(n || 0).toFixed(2);
  const getParam = (name) => new URL(window.location.href).searchParams.get(name);

  /* Keep a reference to the car currently being edited */
  let _currentCar = null;
  let _editingImageUrl = '';
  let _confirmResolver = null;

  /* ============================================================
     LOAD & RENDER
  ============================================================ */
  async function load() {
    const id = getParam('id');
    if (!id) {
      qs('#vehicle-detail').innerHTML = '<p style="color:var(--danger)">Missing vehicle id.</p>';
      return;
    }

    try {
      const res = await window.API.car(id);
      if (!res || !res.success) throw new Error(res?.message || 'Failed to load vehicle');
      render(res.data);
    } catch (err) {
      console.error('[car-detail] load error:', err);
      qs('#vehicle-detail').innerHTML =
        `<p style="color:var(--danger)">Unable to load vehicle details: ${err.message}</p>`;
    }
  }

  function render(car) {
    _currentCar = car;

    /* ── Image ── */
    const imgEl = qs('#detail-image');
    const placeholder = qs('#detail-media-placeholder') || qs('.detail-media-placeholder');
    const resolvedImg = car.image_url ? window.API.resolveUrl(car.image_url) : '';

    if (resolvedImg) {
      imgEl.src = resolvedImg;
      imgEl.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      imgEl.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    }

    /* ── Title / subtitle ── */
    qs('#detail-title').textContent =
      [`${car.brand || ''}`, `${car.model || ''}`].filter(Boolean).join(' ') || 'Vehicle';
    qs('#detail-subtitle').textContent =
      [car.year, car.category].filter(Boolean).join(' · ') || '—';

    /* ── Status badge ── */
    qs('#detail-status').innerHTML =
      `<span class="vehicle-detail-status ${car.status || 'available'}">
         ${capitalise(car.status || 'available')}
       </span>`;

    /* ── Spec strip ── */
    const specItems = [
      car.year       && { icon: '📅', label: `${car.year}` },
      car.category   && { icon: '🚗', label: car.category },
      car.spec_line  && { icon: '⚙️', label: car.spec_line },
      car.drive_type && { icon: '🔀', label: car.drive_type },
    ].filter(Boolean);

    const strip = qs('#detail-spec-strip');
    strip.innerHTML = specItems
      .map(i => `<span class="spec-chip">${i.label}</span>`)
      .join('');

    /* ── Stats grid ── */
    const stats = [
      { label: 'Daily rate',    value: `$${fmt(car.daily_rate)}`,  sub: 'per day',      accent: true  },
      { label: 'Penalty rate',  value: `$${fmt(car.penalty_rate)}`, sub: 'overdue/day', accent: true  },
      { label: 'Seats',         value: car.seats ?? '—',            sub: 'passengers',  accent: false },
      { label: 'Transmission',  value: car.transmission === 'manual' ? 'Manual' : 'Auto',
                                                                     sub: 'gearbox',     accent: false },
    ];

    qs('#detail-grid').innerHTML = stats.map(s => `
      <div class="detail-stat${s.accent ? ' accent' : ''}">
        <span class="detail-stat-label">${s.label}</span>
        <span class="detail-stat-value">${s.value}</span>
        <span class="detail-stat-sub">${s.sub}</span>
      </div>
    `).join('');

    /* ── Description ── */
    const descWrap = qs('#detail-description-wrap');
    const descEl   = qs('#detail-description');
    if (car.description && car.description.trim()) {
      descEl.textContent = car.description.trim();
      descWrap.style.display = 'block';
    } else {
      descWrap.style.display = 'none';
    }

    /* ── Attribute chips ── */
    const attrs = [
      car.year         && `${car.year} model`,
      car.category,
      car.seats        && `${car.seats} seats`,
      car.transmission && (car.transmission === 'manual' ? 'Manual' : 'Automatic'),
      car.horsepower   && `${car.horsepower} hp`,
      car.drive_type,
    ].filter(Boolean);

    qs('#detail-attributes').innerHTML = attrs
      .map(a => `<span class="chip">${a}</span>`)
      .join('');

    /* ── Added date ── */
    try {
      qs('#detail-added').textContent =
        'Added ' + new Date(car.created_at).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch { qs('#detail-added').textContent = ''; }

    /* ── Wire buttons ── */
    wireButtons(car);
  }

  /* ============================================================
     BUTTON WIRING
  ============================================================ */
  function wireButtons(car) {
    /* Edit */
    const editBtn = qs('#detail-edit-btn');
    const newEditBtn = editBtn.cloneNode(true);   // remove old listeners
    editBtn.parentNode.replaceChild(newEditBtn, editBtn);
    newEditBtn.addEventListener('click', () => openEditModal(car));

    /* Delete */
    const delBtn = qs('#detail-delete-btn');
    const newDelBtn = delBtn.cloneNode(true);
    delBtn.parentNode.replaceChild(newDelBtn, delBtn);
    newDelBtn.addEventListener('click', () => handleDelete(car.id));

    /* Change status */
    const statusBtn = qs('#change-status-btn');
    const newStatusBtn = statusBtn.cloneNode(true);
    statusBtn.parentNode.replaceChild(newStatusBtn, statusBtn);
    newStatusBtn.addEventListener('click', () => handleStatusChange(car));
  }

  function openConfirmModal({ title, message, confirmText = 'Continue', cancelText = 'Cancel', tone = 'warning' }) {
    return new Promise((resolve) => {
      const modal = qs('#car-confirm-modal');
      const titleEl = qs('#car-confirm-title');
      const messageEl = qs('#car-confirm-message');
      const okBtn = qs('#car-confirm-ok');
      const cancelBtn = qs('#car-confirm-cancel');

      if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
        resolve(window.confirm(message));
        return;
      }

      titleEl.textContent = title || 'Confirm action';
      messageEl.textContent = message || 'Are you sure?';
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;
      okBtn.classList.toggle('btn-submit-danger', tone === 'danger');

      const cleanup = (value) => {
        _confirmResolver = null;
        modal.close();
        resolve(value);
      };

      _confirmResolver = cleanup;
      modal.showModal();
      okBtn.focus();
    });
  }

  /* ============================================================
     DELETE
  ============================================================ */
  async function handleDelete(id) {
    const confirmed = await openConfirmModal({
      title: 'Delete vehicle',
      message: 'Delete this vehicle? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await window.API.deleteCar(id);
      if (res && res.success) {
        window.location.href = './fleet.html';
      } else {
        alert(res?.message || 'Failed to delete vehicle.');
      }
    } catch (err) {
      console.error('[car-detail] delete error:', err);
      alert(err.message || 'Delete failed.');
    }
  }

  /* ============================================================
     STATUS CHANGE  (available ↔ maintenance, skip rented)
  ============================================================ */
  async function handleStatusChange(car) {
    const cycle = { available: 'maintenance', maintenance: 'available', rented: 'available' };
    const newStatus = cycle[car.status] || 'available';
    const confirmed = await openConfirmModal({
      title: 'Change status',
      message: `Change status to "${newStatus}"?`,
      confirmText: 'Change status',
      cancelText: 'Cancel',
      tone: 'warning',
    });
    if (!confirmed) return;

    try {
      const res = await window.API.updateCar(car.id, { status: newStatus });
      if (res && res.success) {
        load(); // reload to reflect new status
      } else {
        alert(res?.message || 'Failed to change status.');
      }
    } catch (err) {
      console.error('[car-detail] status change error:', err);
      alert(err.message || 'Status change failed.');
    }
  }

  /* ============================================================
     EDIT MODAL — open / populate
  ============================================================ */
  function openEditModal(car) {
    /* Populate fields */
    qs('#car-edit-id').value             = car.id;
    qs('[name="make"]').value            = car.brand        || '';
    qs('[name="model"]').value           = car.model        || '';
    qs('[name="year"]').value            = car.year         || '';
    qs('[name="category"]').value        = car.category     || 'Sedan';
    qs('[name="price_per_day"]').value   = car.daily_rate   ?? '';
    qs('[name="horsepower"]').value      = car.horsepower   ?? '';
    qs('[name="transmission"]').value    =
      String(car.transmission || 'auto').toLowerCase() === 'manual' ? 'Manual' : 'Automatic';
    qs('[name="drive_type"]').value      = car.drive_type   || 'AWD';
    qs('[name="spec_line"]').value       = car.spec_line    || '';
    qs('[name="seats"]').value           = car.seats        || 5;
    qs('[name="penalty_rate"]').value    = car.penalty_rate ?? 0;
    qs('[name="description"]').value     = car.description  || '';

    _editingImageUrl = car.image_url || '';
    resetImagePreview();
    if (_editingImageUrl) showImagePreview(_editingImageUrl);

    wireUploadArea();
    qs('#car-edit-modal').showModal();
  }

  /* ── Image preview helpers ── */
  function resetImagePreview() {
    qs('#car-image-preview-area').style.display = 'none';
    qs('#car-image-upload-prompt').style.display = 'flex';
    qs('#car-image-preview').removeAttribute('src');
    qs('#car-image').value = '';
  }

  function showImagePreview(url) {
    const resolved = window.API?.resolveUrl ? window.API.resolveUrl(url) : url;
    qs('#car-image-preview').src = resolved;
    qs('#car-image-preview-area').style.display = 'block';
    qs('#car-image-upload-prompt').style.display = 'none';
  }

  function showImagePreviewFromDataUrl(dataUrl) {
    qs('#car-image-preview').src = dataUrl;
    qs('#car-image-preview-area').style.display = 'block';
    qs('#car-image-upload-prompt').style.display = 'none';
  }

  /* ── Wire upload area (idempotent via clone trick) ── */
  function wireUploadArea() {
    /* file input change */
    const oldInput = qs('#car-image');
    const newInput = oldInput.cloneNode(true);
    oldInput.parentNode.replaceChild(newInput, oldInput);

    newInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => showImagePreviewFromDataUrl(ev.target.result);
        reader.readAsDataURL(file);
      }
    });

    /* drag-and-drop */
    const area = qs('#car-upload-area');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((ev) =>
      area.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); })
    );
    ['dragenter', 'dragover'].forEach((ev) =>
      area.addEventListener(ev, () => area.classList.add('drag-over'))
    );
    ['dragleave', 'drop'].forEach((ev) =>
      area.addEventListener(ev, () => area.classList.remove('drag-over'))
    );
    area.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        newInput.files = dt.files;
        newInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    /* "Change image" button */
    qs('#car-change-image-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      qs('#car-image').click();
    });
  }

  /* ============================================================
     EDIT MODAL — close
  ============================================================ */
  qs('#car-edit-close').addEventListener('click', () => qs('#car-edit-modal').close());
  qs('#car-edit-cancel').addEventListener('click', () => qs('#car-edit-modal').close());

  /* ============================================================
     EDIT MODAL — submit
  ============================================================ */
  qs('#car-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = qs('#car-edit-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const formData = new FormData(qs('#car-edit-form'));
    const imageFile = qs('#car-image').files?.[0];
    const id = qs('#car-edit-id').value;
    let imageUrl = _editingImageUrl;

    try {
      /* Upload new image if one was selected */
      if (imageFile && imageFile.size > 0) {
        if (!imageFile.type.startsWith('image/')) {
          alert('Please select a valid image file (PNG or JPG).');
          return;
        }
        if (imageFile.size > 10 * 1024 * 1024) {
          alert('Image must be smaller than 10 MB.');
          return;
        }
        const uploadRes = await window.API.uploadImage(imageFile, 'car');
        if (uploadRes?.success) {
          imageUrl = uploadRes.data.url;
        } else {
          throw new Error(uploadRes?.message || 'Image upload failed');
        }
      }

      const rawTransmission = formData.get('transmission') || 'Automatic';
      const carData = {
        brand:        formData.get('make'),
        model:        formData.get('model'),
        year:         parseInt(formData.get('year'))         || null,
        category:     formData.get('category')               || 'Sedan',
        seats:        parseInt(formData.get('seats'))        || 5,
        transmission: rawTransmission.toLowerCase() === 'manual' ? 'manual' : 'auto',
        daily_rate:   parseFloat(formData.get('price_per_day')) || 0,
        penalty_rate: parseFloat(formData.get('penalty_rate'))  || 0,
        horsepower:   parseInt(formData.get('horsepower'))   || null,
        drive_type:   formData.get('drive_type')             || 'AWD',
        spec_line:    formData.get('spec_line')              || '',
        description:  formData.get('description')           || '',
        image_url:    imageUrl,
      };

      const res = await window.API.updateCar(id, carData);
      if (res?.success) {
        qs('#car-edit-modal').close();
        load();
      } else {
        throw new Error(res?.message || 'Failed to save changes');
      }
    } catch (err) {
      console.error('[car-detail] save error:', err);
      alert(err.message || 'Save failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save changes';
    }
  });

  /* ============================================================
     CONFIRM MODAL — close / action wiring
  ============================================================ */
  qs('#car-confirm-cancel')?.addEventListener('click', () => {
    if (_confirmResolver) _confirmResolver(false);
  });
  qs('#car-confirm-ok')?.addEventListener('click', () => {
    if (_confirmResolver) _confirmResolver(true);
  });
  qs('#car-confirm-modal')?.addEventListener('cancel', (e) => {
    e.preventDefault();
    if (_confirmResolver) _confirmResolver(false);
  });

  /* ============================================================
     UTILS
  ============================================================ */
  function capitalise(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  /* ============================================================
     INIT
  ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();