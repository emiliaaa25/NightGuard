document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function initDashboard() {
    setupSidebar();
    renderCommunitySafety();
    renderSafetyFeatures();
    renderMyAlerts();
    setupExploreButton();
}

function setupSidebar() {
    const icons = document.querySelectorAll('.sidebar-icon');
    icons.forEach(icon => {
        icon.addEventListener('click', () => {
            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
        });
    });
}

// Community Safety Cards Data
const communitySafetyData = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=200&fit=crop',
        name: 'Alex',
        title: 'Local Guide',
        duration: '30m',
        rating: '4.8/5',
        buttonText: 'Join'
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=200&fit=crop',
        name: 'Maria',
        title: 'Safety Tips',
        duration: '15m',
        rating: '4.7/5',
        buttonText: 'Learn'
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=200&fit=crop',
        name: 'Communit',
        title: 'Travel Alerts',
        duration: '2h 10m',
        rating: '4.8/5',
        buttonText: 'Join'
    },
    {
        id: 4,
        image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=200&fit=crop',
        name: 'Alex',
        title: 'NightGuard',
        duration: '1h 45m',
        rating: '4.5/5',
        buttonText: 'Alert'
    }
];

function renderCommunitySafety() {
    const container = document.getElementById('communitySafetyCards');
    if (!container) return;

    container.innerHTML = '';

    communitySafetyData.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'safety-card';
        cardEl.innerHTML = `
            <img src="${card.image}" alt="${card.title}" class="safety-card-image">
            <div class="safety-card-overlay">
                <div class="safety-card-profile">
                    <div class="safety-card-avatar">${card.name[0]}</div>
                    <span class="safety-card-name">${card.name}</span>
                </div>
                <div class="safety-card-title">${card.title}</div>
                <div class="safety-card-details">
                    <span>${card.duration}</span>
                    <span>★ ${card.rating}</span>
                </div>
                <button class="safety-card-button">${card.buttonText}</button>
            </div>
        `;

        cardEl.querySelector('.safety-card-button').addEventListener('click', () => {
            alert(`Demo: ${card.buttonText} clicked for "${card.title}"`);
        });

        container.appendChild(cardEl);
    });
}

// Safety Features Data
const safetyFeaturesData = [
    { icon: '📍', text: 'Location Sharing' },
    { icon: '📞', text: 'Emergency Contacts' },
    { icon: '🔔', text: 'Community Alerts' },
    { icon: '💡', text: 'Night Travel Tips' },
    { icon: '💬', text: 'User Reviews' },
    { icon: '📊', text: 'Safety Stats' },
    { icon: '🗺️', text: 'Travel Routes' }
];

function renderSafetyFeatures() {
    const container = document.getElementById('safetyFeatures');
    if (!container) return;

    container.innerHTML = '';

    safetyFeaturesData.forEach(feature => {
        const btn = document.createElement('button');
        btn.className = 'safety-feature-btn';
        btn.innerHTML = `
            <span class="safety-feature-icon">${feature.icon}</span>
            <span class="safety-feature-text">${feature.text}</span>
        `;

        btn.addEventListener('click', () => {
            alert(`Demo: ${feature.text} clicked`);
        });

        container.appendChild(btn);
    });
}

// My Alerts Data
const myAlertsData = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=200&fit=crop',
        title: 'Recent Alerts',
        name: 'Jamie Lee',
        progress: 85
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=200&fit=crop',
        title: 'Safety Tips',
        name: 'Taylor Smith',
        progress: 40
    }
];

function renderMyAlerts() {
    const container = document.getElementById('myAlertsCards');
    if (!container) return;

    container.innerHTML = '';

    myAlertsData.forEach(alert => {
        const cardEl = document.createElement('div');
        cardEl.className = 'alert-card';
        cardEl.innerHTML = `
            <img src="${alert.image}" alt="${alert.title}" class="alert-card-image">
            <div class="alert-card-bookmark">🔖</div>
            <div class="alert-card-overlay">
                <div class="alert-card-title">${alert.title}</div>
                <div class="alert-card-name">${alert.name}</div>
                <div class="alert-card-progress">
                    <span class="alert-progress-text">${alert.progress}% ${alert.progress >= 50 ? 'active' : 'complete'}</span>
                    <div class="alert-progress-bar">
                        <div class="alert-progress-fill" style="width: ${alert.progress}%"></div>
                    </div>
                </div>
            </div>
        `;

        cardEl.querySelector('.alert-card-bookmark').addEventListener('click', () => {
            alert(`Demo: Bookmark toggled for "${alert.title}"`);
        });

        container.appendChild(cardEl);
    });
}

function setupExploreButton() {
    const exploreBtn = document.querySelector('.explore-button');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            alert('Demo: Explore button clicked - This would navigate to more content');
        });
    }
}
