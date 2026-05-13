(() => {
    let fleet = [];

    async function loadFleet() {
        try {
            const res = await window.API.cars();
            if (res && res.success) {
                // Handle both paginated and flat unpaginated structures
                fleet = Array.isArray(res.data) ? res.data : (res.data.data || []);
                updateStats();
                
                // Get current status filter
                const activeStatus = document.querySelector('.segmented.compact input:checked')?.value || 'all';
                const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
                filterFleet(activeStatus, searchTerm);
            }
        } catch (e) {
            console.error("Error loading fleet", e);
        }
    }

    function updateStats() {
        const total = fleet.length;
        const available = fleet.filter(c => c.status === 'available').length;
        const rented = fleet.filter(c => c.status === 'rented').length;
        const maintenance = fleet.filter(c => c.status === 'maintenance').length;

        const statTotal = document.getElementById('stat-total');
        if (statTotal) statTotal.textContent = total;
        
        const statAvailable = document.getElementById('stat-available');
        if (statAvailable) statAvailable.textContent = available;
        
        const statRented = document.getElementById('stat-rented');
        if (statRented) statRented.textContent = rented;

        const statMaintenance = document.getElementById('stat-maintenance');
        if (statMaintenance) statMaintenance.textContent = maintenance;
    }

    function renderGrid(cars) {
        const grid = document.getElementById('fleet-grid');
        if (!grid) return;
        
        if (cars.length === 0) {
            grid.innerHTML = '<div class="empty-state"><h2>No vehicles found.</h2></div>';
            return;
        }

        // SVG placeholder for cars without images
        const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23e5e5e5%22 width=%22400%22 height=%22300%22/%3E%3Crect x=%2250%22 y=%2280%22 width=%22300%22 height=%22150%22 rx=%2210%22 fill=%22%23d0d0d0%22/%3E%3Ccircle cx=%22120%22 cy=%22210%22 r=%2215%22 fill=%22%23999%22/%3E%3Ccircle cx=%22280%22 cy=%22210%22 r=%2215%22 fill=%22%23999%22/%3E%3Ctext x=%22200%22 y=%22250%22 font-size=%2216%22 fill=%22%23666%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';

        grid.innerHTML = cars.map(car => `
            <div class="vehicle-card flex-col">
                <div class="vehicle-card-top">
                    <span class="badge ${car.status === 'available' ? 'bg-success text-white' : car.status === 'maintenance' ? 'bg-warning text-black' : 'bg-brand text-white'} padding-x-8 padding-y-4 rounded-4 text-12 font-bold uppercase">${car.status}</span>
                </div>
                <div class="vehicle-media">
                    <img src="${car.image_url ? 'http://localhost:8082' + car.image_url : placeholderSvg}" alt="${car.brand} ${car.model}" style="object-fit: cover; width: 100%; height: 100%;">
                </div>
                <div class="vehicle-body">
                    <div class="vehicle-title-row">
                        <h2>${car.brand} ${car.model}</h2>
                    </div>
                    <div class="vehicle-subtitle">${car.description || car.category + ' • ' + car.transmission + ' • ' + car.seats + ' Seats'}</div>
                    <div class="flex-row justify-between align-center mt-8">
                        <div class="rating">★★★★★ (${Math.floor(Math.random() * 500)})</div>
                        <div class="vehicle-price">$${car.daily_rate}<span>/day</span></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

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

    document.addEventListener('DOMContentLoaded', () => {
        loadFleet();

        const addVehicleModal = document.getElementById('add-vehicle-modal');
        const addVehicleBtn = document.getElementById('add-vehicle-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const addVehicleForm = document.getElementById('add-vehicle-form');
        const logoutBtn = document.querySelector('[data-logout]');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await window.API.logout();
                } finally {
                    window.location.replace('../auth/login.html');
                }
            });
        }

        // Search and Filters
        document.querySelectorAll('input[name="fleet_status"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const status = e.target.value;
                const searchTerm = document.getElementById('search-input').value.toLowerCase();
                filterFleet(status, searchTerm);
            });
        });

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            const status = document.querySelector('input[name="fleet_status"]:checked')?.value || 'all';
            const searchTerm = e.target.value.toLowerCase();
            filterFleet(status, searchTerm);
        });

        // Image Preview Handler
        const vehicleImageInput = document.getElementById('vehicle-image');
        const imagePreviewArea = document.getElementById('image-preview-area');
        const imageUploadPrompt = document.getElementById('image-upload-prompt');
        const imagePreview = document.getElementById('image-preview');
        const changeImageBtn = document.getElementById('change-image-btn');

        if (vehicleImageInput) {
            vehicleImageInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imagePreview.src = event.target.result;
                        imagePreviewArea.style.display = 'block';
                        imageUploadPrompt.style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Drag and drop support
            const uploadArea = vehicleImageInput.parentElement;
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.style.backgroundColor = 'hsl(0,0%,90%)';
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.style.backgroundColor = 'transparent';
                });
            });

            uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    vehicleImageInput.files = files;
                    const event = new Event('change', { bubbles: true });
                    vehicleImageInput.dispatchEvent(event);
                }
            });
        }

        if (changeImageBtn) {
            changeImageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                vehicleImageInput.click();
            });
        }

        // Modal triggers
        if (addVehicleBtn && addVehicleModal) {
            addVehicleBtn.addEventListener('click', () => {
                addVehicleModal.showModal();
            });
        }
        if (closeModalBtn && addVehicleModal) {
            closeModalBtn.addEventListener('click', () => {
                addVehicleModal.close();
            });
        }

        // Form Submit
        if (addVehicleForm) {
            addVehicleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(addVehicleForm);
                const imageFile = formData.get('image');
                let imageUrl = '';

                try {
                    // Validate and upload image file
                    if (imageFile && imageFile.size > 0) {
                        if (!imageFile.type.startsWith('image/')) {
                            alert('Please select a valid image file (JPEG, PNG, or WebP)');
                            return;
                        }
                        if (imageFile.size > 10 * 1024 * 1024) {
                            alert('Image file must be smaller than 10MB');
                            return;
                        }

                        try {
                            const imgUploadRes = await window.API.uploadImage(imageFile, 'car');
                            if (imgUploadRes && imgUploadRes.success) {
                                imageUrl = imgUploadRes.data.url;
                            }
                        } catch (uploadError) {
                            const errorMsg = uploadError.message || 'Image upload failed for unknown reason';
                            console.error('Upload error:', errorMsg, uploadError);
                            alert('Failed to upload image: ' + errorMsg);
                            return;
                        }
                    } else if (imageFile && imageFile.size === 0) {
                        alert('Image file is empty. Please select a valid image file');
                        return;
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
                    
                    const response = await window.API.addCar(carData);
                    if (response.success) {
                        addVehicleModal.close();
                        addVehicleForm.reset();
                        // Reset image preview
                        if (imagePreviewArea) {
                            imagePreviewArea.style.display = 'none';
                            imageUploadPrompt.style.display = 'block';
                        }
                        loadFleet(); // Reload grid
                    } else {
                        alert('Failed to add car: ' + response.message);
                    }
                } catch (error) {
                    console.error('Error submitting form:', error);
                    const errorMsg = error?.message || 'An unexpected error occurred. Please try again.';
                    alert(errorMsg);
                }
            });
        }
    });

})();
