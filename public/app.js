const API_URL = '/api';

// --- AUTHENTICATION ---
async function quickLogin(email) {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '1234' })
    });
    const user = await res.json();
    if (res.ok) {
        localStorage.setItem('foodshare_user', JSON.stringify(user));
        window.location.href = 'dashboard.html';
    }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('foodshare_user', JSON.stringify(data));
        window.location.href = 'dashboard.html';
    } else {
        alert(data.error);
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('regName').value,
        role: document.getElementById('regRole').value,
        phone: document.getElementById('regPhone').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value
    };
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('foodshare_user', JSON.stringify(data));
        window.location.href = 'dashboard.html';
    } else {
        alert(data.error);
    }
});

function logout() {
    localStorage.removeItem('foodshare_user');
    window.location.href = 'index.html';
}

// --- HELPER: CALCULATE FRESHNESS ---
function getTimeRemaining(expiryIso) {
    const diffMs = new Date(expiryIso) - new Date();
    if (diffMs <= 0) return '<span class="badge bg-danger">⚠️ Expired</span>';
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `<span class="badge bg-warning text-dark">⏳ ${hrs}h ${mins}m left</span>`;
}

// --- LOAD LIVE STATS & COMMUNITY DIRECTORY ON HOME PAGE ---
async function loadCommunityStatsAndDirectory() {
    if (!document.getElementById('statMeals')) return;

    // 1. Fetch Live Stats
    const statsRes = await fetch(`${API_URL}/stats`);
    const stats = await statsRes.json();
    document.getElementById('statMeals').innerText = `${stats.totalMeals}+`;
    document.getElementById('statVolunteers').innerText = stats.volunteersCount;
    document.getElementById('statNgos').innerText = stats.ngosCount;
    document.getElementById('statDonors').innerText = stats.donorsCount;

    // 2. Fetch Users Directory
    const usersRes = await fetch(`${API_URL}/users`);
    const users = await usersRes.json();

    const donors = users.filter(u => u.role === 'donor');
    const volunteers = users.filter(u => u.role === 'volunteer');
    const ngos = users.filter(u => u.role === 'ngo');

    document.getElementById('donorListCount').innerText = donors.length;
    document.getElementById('volListCount').innerText = volunteers.length;
    document.getElementById('ngoListCount').innerText = ngos.length;

    document.getElementById('donorDirectoryList').innerHTML = donors.map(d => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div><strong>${d.name}</strong><small class="d-block text-muted">📞 ${d.phone}</small></div>
            <span class="badge bg-success-subtle text-success rounded-pill">Verified Donor</span>
        </li>
    `).join('');

    document.getElementById('volunteerDirectoryList').innerHTML = volunteers.map(v => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div><strong>${v.name}</strong><small class="d-block text-muted">📞 ${v.phone}</small></div>
            <span class="badge bg-primary-subtle text-primary rounded-pill">Active Rider</span>
        </li>
    `).join('');

    document.getElementById('ngoDirectoryList').innerHTML = ngos.map(n => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div><strong>${n.name}</strong><small class="d-block text-muted">📞 ${n.phone}</small></div>
            <span class="badge bg-warning-subtle text-dark rounded-pill">Partner NGO</span>
        </li>
    `).join('');
}

// --- RENDER PUBLIC HOME FEED ---
async function loadPublicDonations() {
    const grid = document.getElementById('publicFoodGrid');
    if (!grid) return;

    const res = await fetch(`${API_URL}/donations`);
    const donations = await res.json();

    grid.innerHTML = donations.map(item => `
        <div class="col-md-6 col-lg-3">
            <div class="card food-card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                <img src="${item.imageUrl}" class="card-img-top object-fit-cover" height="175" alt="Food">
                <div class="card-body d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge ${item.status === 'Delivered' ? 'bg-secondary' : 'bg-success'}">${item.status}</span>
                            ${getTimeRemaining(item.expiryTime)}
                        </div>
                        <h6 class="card-title fw-bold">${item.foodItems}</h6>
                        <p class="text-muted small mb-1">🏨 <strong>Donor:</strong> ${item.donorName}</p>
                        <p class="text-muted small mb-1">👥 <strong>Feeds:</strong> ${item.quantity} Needy People</p>
                        <p class="text-muted small mb-2">📍 <strong>Location:</strong> ${item.location}</p>
                    </div>
                    <div class="bg-light p-2 rounded-3 small">
                        <div>🛵 <strong>Rider:</strong> ${item.volunteerName}</div>
                        <div>🤝 <strong>NGO:</strong> ${item.ngoName}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// --- SAMPLE CERTIFICATE ON HOME PAGE ---
function openSampleCertificate() {
    document.getElementById('sampleCertBody').innerHTML = generateCertificateMarkup(
        'Spice Garden Hotel',
        'Hotel & Restaurant Surplus',
        85,
        'Helping Hands NGO',
        'Rahul Sharma (Rider)'
    );
    new bootstrap.Modal(document.getElementById('sampleCertModal')).show();
}

function generateCertificateMarkup(donorName, eventType, quantity, ngoName, volunteerName) {
    return `
        <div class="border border-4 border-success p-4 text-center rounded-4 bg-white">
            <div class="d-flex justify-content-between small text-muted mb-2">
                <span>Certificate ID: #FS-${Math.floor(1000 + Math.random() * 9000)}</span>
                <span>Zero Food Waste Initiative 🌱</span>
            </div>
            <h2 class="text-success fw-bold mb-1">🍲 FoodShare Events</h2>
            <p class="text-muted text-uppercase small mb-3">Certificate of Social Impact & Humanitarian Service</p>
            <hr>
            <p class="mb-1">This certificate is proudly presented to</p>
            <h3 class="fw-bold text-dark my-2">${donorName}</h3>
            <p class="mb-2">in recognition of generously donating surplus food from <strong>${eventType}</strong>, successfully delivered by Volunteer Hero <strong>${volunteerName}</strong>.</p>
            <p>Together, this contribution provided <strong>${quantity} nutritious meals</strong> to <strong>${ngoName}</strong> for needy people and prevented <strong>${Math.round(quantity * 2.5)} kg of CO₂</strong> emissions.</p>
            <div class="d-flex justify-content-between mt-4 pt-3 border-top small text-muted">
                <span>Date: ${new Date().toLocaleDateString()}</span>
                <span>Verified by FoodShare Admin 🛡️</span>
            </div>
        </div>
    `;
}

// --- DASHBOARD INITIALIZATION ---
async function initDashboard() {
    const grid = document.getElementById('dashboardFoodGrid');
    if (!grid) return;

    const user = JSON.parse(localStorage.getItem('foodshare_user'));
    if (!user) return (window.location.href = 'index.html');

    document.getElementById('userBadge').innerText = `${user.name} (${user.role.toUpperCase()})`;

    if (user.role === 'donor' || user.role === 'admin') {
        document.getElementById('donorPanel').classList.remove('d-none');
    }
    if (user.role === 'volunteer') {
        document.getElementById('volunteerPanel').classList.remove('d-none');
    }
    if (user.role === 'admin') {
        document.getElementById('adminPanel').classList.remove('d-none');
        loadAdminUsers();
    }

    loadDashboardDonations(user);
}

async function loadDashboardDonations(user) {
    const grid = document.getElementById('dashboardFoodGrid');
    const res = await fetch(`${API_URL}/donations`);
    const donations = await res.json();

    grid.innerHTML = donations.map(item => {
        let actionButtons = '';

        // Volunteer Actions
        if (user.role === 'volunteer') {
            if (item.status === 'Available') {
                actionButtons = `<button onclick="updateDonation(${item.id}, 'Assigned', '${user.name}', null)" class="btn btn-primary btn-sm w-100 fw-bold">🛵 Accept Pickup</button>`;
            } else if (item.status === 'Assigned') {
                actionButtons = `
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}" target="_blank" class="btn btn-outline-dark btn-sm w-100 mb-2">📍 Open Google Maps</a>
                    <button onclick="updateDonation(${item.id}, 'Delivered', null, null)" class="btn btn-success btn-sm w-100 fw-bold">✅ Mark Delivered to NGO</button>`;
            }
        }

        // NGO Actions
        if (user.role === 'ngo' && item.ngoName === 'Pending NGO') {
            actionButtons = `<button onclick="updateDonation(${item.id}, null, null, '${user.name}')" class="btn btn-warning btn-sm w-100 fw-bold">🤝 Claim for Our NGO</button>`;
        }

        // Certificate Button for Donors, Volunteers & Admins on Delivered Orders
        if ((user.role === 'donor' || user.role === 'volunteer' || user.role === 'admin') && item.status === 'Delivered') {
            actionButtons += `<button onclick="openCertificate('${item.donorName}', '${item.eventType}', ${item.quantity}, '${item.ngoName}', '${item.volunteerName}')" class="btn btn-outline-success btn-sm w-100 mb-2 fw-bold">🏆 Download Certificate</button>`;
        }

        // Admin Delete Action
        if (user.role === 'admin') {
            actionButtons += `<button onclick="deleteDonation(${item.id})" class="btn btn-danger btn-sm w-100">🗑️ Remove Entry</button>`;
        }

        return `
        <div class="col-md-4">
            <div class="card food-card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                <img src="${item.imageUrl}" class="card-img-top object-fit-cover" height="170" alt="Food">
                <div class="card-body d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge ${item.status === 'Delivered' ? 'bg-secondary' : 'bg-success'}">${item.status}</span>
                            ${getTimeRemaining(item.expiryTime)}
                        </div>
                        <h5 class="fw-bold">${item.foodItems}</h5>
                        <p class="small mb-1">🏨 ${item.donorName} • 👥 ${item.quantity} Meals</p>
                        <p class="small mb-1">📍 ${item.location}</p>
                        <p class="small mb-1">🛵 Rider: <strong>${item.volunteerName}</strong></p>
                        <p class="small mb-3">🤝 NGO: <strong>${item.ngoName}</strong></p>
                    </div>
                    <div>${actionButtons}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openCertificate(donorName, eventType, quantity, ngoName, volunteerName) {
    document.getElementById('certificateContent').innerHTML = generateCertificateMarkup(
        donorName, eventType, quantity, ngoName, volunteerName
    );
    new bootstrap.Modal(document.getElementById('certModal')).show();
}

// Donor Post Submit
document.getElementById('donateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('foodshare_user'));
    const payload = {
        donorName: user.name,
        eventType: document.getElementById('eventType').value,
        foodItems: document.getElementById('foodItems').value,
        quantity: document.getElementById('quantity').value,
        location: document.getElementById('location').value,
        hoursValid: document.getElementById('hoursValid').value,
        imageUrl: document.getElementById('imageUrl').value
    };

    await fetch(`${API_URL}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    e.target.reset();
    initDashboard();
});

async function updateDonation(id, status, volunteerName, ngoName) {
    await fetch(`${API_URL}/donations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, volunteerName, ngoName })
    });
    initDashboard();
}

async function deleteDonation(id) {
    await fetch(`${API_URL}/donations/${id}`, { method: 'DELETE' });
    initDashboard();
}

async function loadAdminUsers() {
    const res = await fetch(`${API_URL}/users`);
    const users = await res.json();
    document.getElementById('adminUsersTable').innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td class="fw-bold">${u.name}</td>
            <td><span class="badge bg-info text-dark">${u.role.toUpperCase()}</span></td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
        </tr>
    `).join('');
}

loadCommunityStatsAndDirectory();
loadPublicDonations();
initDashboard();
