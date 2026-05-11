(() => {
	const configuredBaseUrl =
		window.CRMS_API_BASE_URL ||
		localStorage.getItem('CRMS_API_BASE_URL') ||
		'http://127.0.0.1:8082';

	async function request(path, options = {}) {
		const isFormData = options.body instanceof FormData;
		const response = await fetch(`${configuredBaseUrl}${path}`, {
			credentials: 'include',
			headers: {
				...(isFormData ? {} : { 'Content-Type': 'application/json' }),
				...(options.headers || {}),
			},
			...options,
		});

		let payload = null;
		try {
			payload = await response.json();
		} catch {
			payload = { success: false, message: 'Invalid server response' };
		}

		if (response.status === 401) {
			window.dispatchEvent(new CustomEvent('crms:unauthorized'));
		}

		if (!response.ok || payload?.success === false) {
			const message = payload?.message || `Request failed (${response.status})`;
			throw new Error(message);
		}

		return payload;
	}

	const API = {
		baseUrl: configuredBaseUrl,
		request,
		resolveUrl(url) {
			if (!url) {
				return '';
			}
			if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
				return url;
			}
			return `${configuredBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
		},
		login(email, password) {
			return request('/auth/login', {
				method: 'POST',
				body: JSON.stringify({ email, password }),
			});
		},
		register(data) {
			return request('/auth/register', {
				method: 'POST',
				body: JSON.stringify(data),
			});
		},
		uploadImage(file, type = 'car') {
			const formData = new FormData();
			formData.append('image', file);
			formData.append('type', type);

			return request('/upload/image', {
				method: 'POST',
				body: formData,
			});
		},
		async me() {
                        const res = await request('/auth/me', { method: 'GET' });
                        if (res && res.data && res.data.has_notification) {
                                window.UIUtils?.showNotificationBanner?.(res.data.notification_car);
                        }
                        return res;
                },
		logout() {
			return request('/auth/logout', { method: 'POST' });
		},
		cars(params = {}) {
			const query = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					query.set(key, value);
				}
			});

			return request(`/cars${query.toString() ? `?${query}` : ''}`, { method: 'GET' });
		},
		car(carId) {
			return request(`/cars/${carId}`, { method: 'GET' });
		},
		carAvailability(carId) {
			return request(`/cars/${carId}/availability`, { method: 'GET' });
		},
		createBooking(data) {
			return request('/bookings', {
				method: 'POST',
				body: JSON.stringify(data),
			});
		},
		myBookings(params = {}) {
			const query = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					query.set(key, value);
				}
			});

			return request(`/bookings/mine${query.toString() ? `?${query}` : ''}`, { method: 'GET' });
		},
		cancelBooking(bookingId) {
			return request(`/bookings/${bookingId}`, { method: 'DELETE' });
		},
		extendBooking(bookingId, newEndDate) {
			return request(`/bookings/${bookingId}/extend`, {
				method: 'PUT',
				body: JSON.stringify({ new_end_date: newEndDate }),
			});
		},
		validatePromo(code) {
			return request('/promos/validate', {
				method: 'POST',
				body: JSON.stringify({ code }),
			});
		},
		favourites() {
			return request('/favourites', { method: 'GET' });
		},
		addFavourite(carId) {
			return request(`/favourites/${carId}`, { method: 'POST' });
		},
		removeFavourite(carId) {
			return request(`/favourites/${carId}`, { method: 'DELETE' });
		},
		joinWaitlist(carId) {
                        return request(`/waitlist/${carId}`, { method: 'POST' });
                },
                submitReview(bookingId, rating, comment) {
                        return request(`/bookings/${bookingId}/review`, {
                                method: 'POST',
                                body: JSON.stringify({ rating, comment }),
                        });
                },
                // Admin endpoints
                adminStats() {
                        return request('/admin/stats', { method: 'GET' });
                },
                adminCustomers(params = {}) {
			const query = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') query.set(key, value);
			});
                        return request(`/admin/customers${query.toString() ? `?${query}` : ''}`, { method: 'GET' });
                },
                adminCustomer(id) {
                        return request(`/admin/customers/${id}`, { method: 'GET' });
                },
                verifyLicense(id) {
                        return request(`/admin/customers/${id}/verify`, { method: 'PUT' });
                },
                addCar(data) {
                        return request('/cars', {
                                method: 'POST',
                                body: JSON.stringify(data),
                        });
                },
                updateCar(id, data) {
                        return request(`/cars/${id}`, {
                                method: 'PUT',
                                body: JSON.stringify(data),
                        });
                },
                deleteCar(id) {
                        return request(`/cars/${id}`, { method: 'DELETE' });
                },
                allBookings(params = {}) {
			const query = new URLSearchParams();
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') query.set(key, value);
			});
                        return request(`/bookings${query.toString() ? `?${query}` : ''}`, { method: 'GET' });
                },
                confirmBooking(id) {
                        return request(`/bookings/${id}/confirm`, { method: 'PUT' });
                },
                returnBooking(id, data) {
                        return request(`/bookings/${id}/return`, {
                                method: 'PUT',
                                body: JSON.stringify(data),
                        });
                },
                promos() {
                        return request('/promos', { method: 'GET' });
                },
                createPromo(data) {
                        return request('/promos', {
                                method: 'POST',
                                body: JSON.stringify(data),
                        });
                },
                updatePromo(id, data) {
                        return request(`/promos/${id}`, {
                                method: 'PUT',
                                body: JSON.stringify(data),
                        });
                },
                damageReports() {
                        return request('/damage-reports', { method: 'GET' });
                },
                resolveDamage(id) {
                        return request(`/damage-reports/${id}/resolve`, { method: 'PUT' });
                },
                // End Admin endpoints

                // AI endpoints
		ai: {
			chat(message, history = []) {
				return request('/ai/chat', {
					method: 'POST',
					body: JSON.stringify({ message, history }),
				});
			},
			recommend(prompt) {
				return request('/ai/recommend', {
					method: 'POST',
					body: JSON.stringify({ prompt }),
				});
			},
			summarizeReviews(carId) {
				return request(`/ai/reviews/${carId}/summary`, { method: 'GET' });
			},
		},
	};

	window.API = API;
})();
