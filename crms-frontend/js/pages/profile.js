(() => {
    const PLACEHOLDER = 'N/A';

    function textOrPlaceholder(value, fallback = PLACEHOLDER) {
        const normalized = value == null ? '' : String(value).trim();
        return normalized ? normalized : fallback;
    }

	const initUser = async () => {
		try {
			const res = await window.API.me();
			if (!res || !res.data) throw new Error("No user");
			const user = res.data;
			const verified = Number(user.license_verified) === 1;
			
				document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = textOrPlaceholder(user.name));
				document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = textOrPlaceholder(user.email));
				document.querySelectorAll('[data-user-phone]').forEach(el => el.textContent = textOrPlaceholder(user.phone));
				document.querySelectorAll('[data-user-license]').forEach(el => el.textContent = textOrPlaceholder(user.license_number));
				document.querySelectorAll('[data-user-dob]').forEach(el => el.textContent = textOrPlaceholder(user.date_of_birth ?? user.dob));
				document.querySelectorAll('[data-user-address]').forEach(el => el.textContent = textOrPlaceholder(user.address));
				document.querySelectorAll('[data-user-license-expiry]').forEach(el => el.textContent = textOrPlaceholder(user.license_expiry ?? user.license_expires_at));
				document.querySelectorAll('[data-user-license-status]').forEach(el => el.textContent = verified ? 'License verified' : 'License pending verification');
				document.querySelectorAll('[data-user-license-verified]').forEach(el => el.textContent = verified ? 'Verified' : 'Pending verification');
				const initials = (user.name || '').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
                document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
			
            const notificationPanel = document.querySelector('#notifications .profile-note');
            if (notificationPanel) {
                try {
                    const waitlistRes = await window.API.waitlistMine();
                    const waitlistItems = waitlistRes.data || [];
                    const availableAlerts = waitlistItems.filter(item => item.status === 'available' || Number(item.notified) === 1);

                    if (!waitlistItems.length) {
                        notificationPanel.innerHTML = `
                            <p>You are not on any waitlist yet.</p>
                            <p class="muted">Open any unavailable car and tap Notify me to get availability alerts.</p>
                        `;
                    } else if (!availableAlerts.length) {
                        notificationPanel.innerHTML = `
                            <p>No waitlisted car is available yet.</p>
                            <p class="muted">We will notify you here when one of your watched cars becomes available.</p>
                        `;
                    } else {
                        notificationPanel.innerHTML = `
                            <div class="profile-notification-list">
                                ${availableAlerts.map(item => `
                                    <article class="profile-notification-item">
                                        <div>
                                            <strong>${item.brand} ${item.model} is now available</strong>
                                            <p class="muted">${item.category || 'Vehicle'} · ${window.UIUtils.formatMoney(item.daily_rate)} / day</p>
                                        </div>
                                        <a class="btn-secondary" href="./car-detail.html?id=${item.car_id}&book=1">Book now</a>
                                    </article>
                                `).join('')}
                            </div>
                        `;
                    }
                } catch {
                    notificationPanel.innerHTML = `
                        <p>We could not load your waitlist notifications right now.</p>
                        <p class="muted">Try again in a moment or use Manage to open your waitlist page.</p>
                    `;
                }
            }
			
		} catch (err) {
			console.error(err);
			window.location.replace('../auth/login.html');
		}

		document.querySelectorAll('[data-logout]').forEach(btn => {
			btn.addEventListener('click', async () => {
				await window.API.logout();
				window.location.replace('../auth/login.html');
			});
		});

        // Tab Handling
        const hash = window.location.hash || '#personal-info';
        const sections = document.querySelectorAll('.profile-section');
        const navLinks = document.querySelectorAll('.profile-link');

        const showTab = (tabId) => {
            sections.forEach(sec => sec.style.display = 'none');
            navLinks.forEach(link => link.classList.remove('active'));
            
            // Re-show the password section always if doing "page" layout
            const passwordSection = document.querySelector('#password-section');
            
            const target = document.querySelector(tabId);
            if (target) {
                target.style.display = 'grid';
                if(tabId === '#personal-info' && passwordSection) {
                    passwordSection.style.display = 'grid';
                }
            }

            const activeLink = document.querySelector(`.profile-link[href="${tabId}"]`);
            if (activeLink) activeLink.classList.add('active');
        };

        window.addEventListener('hashchange', () => showTab(window.location.hash));
        
		// Initial setup
        showTab(hash);

        // Fetch activity
        try {
            const bookingsRes = await window.API.myBookings();
            const bookings = bookingsRes.data?.data || [];
            const activityList = document.querySelector('[data-activity-list]');
            
            if (activityList) {
                if (bookings.length === 0) {
                    activityList.innerHTML = `<li class="muted">No recent activity</li>`;
                } else {
                    activityList.innerHTML = bookings.slice(0, 5).map(b => {
                        const date = new Intl.DateTimeFormat(undefined, { 
                            month: 'short', day: 'numeric', year: 'numeric' 
                        }).format(new Date(b.created_at || b.start_date));
                        
                        let message = `Booked ${b.brand} ${b.model}`;
                        if (b.status === 'cancelled') message = `Cancelled booking for ${b.brand} ${b.model}`;
                        if (b.status === 'completed') message = `Completed rental for ${b.brand} ${b.model}`;
                        
                        return `
                            <li>
                                <span>${message}</span>
                                <strong>${date}</strong>
                            </li>
                        `;
                    }).join('');
                }
            }
        } catch (err) {
            console.error("Failed to load activity", err);
            const activityList = document.querySelector('[data-activity-list]');
            if (activityList) activityList.innerHTML = `<li class="muted">Could not load activity</li>`;
        }
	};

	initUser();
})();
