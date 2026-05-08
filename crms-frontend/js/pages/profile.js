(() => {
	const initUser = async () => {
		try {
			const res = await window.API.me();
			if (!res || !res.data) throw new Error("No user");
			const user = res.data;
			
			document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name || '');
			document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email || '');
			document.querySelectorAll('[data-user-phone]').forEach(el => el.textContent = user.phone || 'Not set');
			document.querySelectorAll('[data-user-license]').forEach(el => el.textContent = user.license_number || 'Not set');
			
			const parts = (user.name || '').split(' ');
			document.querySelectorAll('[data-user-first]').forEach(el => el.textContent = parts[0] || '');
			document.querySelectorAll('[data-user-last]').forEach(el => el.textContent = parts.slice(1).join(' ') || '');
			
			const initials = parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
			document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
			
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
