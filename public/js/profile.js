document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

function initProfile() {
    loadUserProfile();
    renderAchievements();
    renderNearbyConnections();
    renderCommunity();
    setupFriendsActions();
}

// Load user profile data
async function loadUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const data = await response.json();
        
        // Update profile information
        if (data.user) {
            document.getElementById('profileName').textContent = data.user.full_name || data.user.username || 'User';
            if (data.user.email) {
                // Email is not shown in the new design, but we keep it for reference
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Use default values if API fails
    }
}

// Achievements data
const achievementsData = [
    {
        id: 1,
        icon: '🏆',
        title: 'Safety Advocate',
        description: 'Complete safety missions',
        progress: '4/5'
    },
    {
        id: 2,
        icon: '🏆',
        title: 'Community Builder',
        description: 'Engage 700 more members',
        progress: '300/1000'
    }
];

function renderAchievements() {
    const container = document.getElementById('achievementsList');
    if (!container) return;

    container.innerHTML = '';

    achievementsData.forEach(achievement => {
        const card = document.createElement('div');
        card.className = 'achievement-card';
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
            <div class="achievement-progress">${achievement.progress}</div>
        `;
        container.appendChild(card);
    });
}

// Nearby Connections data
const nearbyConnectionsData = [
    {
        id: 1,
        name: 'Emily Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop'
    },
    {
        id: 2,
        name: 'David Brown',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop'
    }
];

function renderNearbyConnections() {
    const container = document.getElementById('nearbyConnections');
    if (!container) return;

    container.innerHTML = '';

    nearbyConnectionsData.forEach(connection => {
        const item = document.createElement('div');
        item.className = 'connection-item';
        item.innerHTML = `
            <img src="${connection.avatar}" alt="${connection.name}" class="connection-avatar">
            <div class="connection-info">
                <div class="connection-name">${connection.name}</div>
            </div>
            <div class="connection-actions">
                <button class="connection-action-btn" data-action="add" data-id="${connection.id}" title="Add friend">👤+</button>
                <button class="connection-action-btn" data-action="remove" data-id="${connection.id}" title="Remove">👤-</button>
            </div>
        `;

        item.querySelectorAll('.connection-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                const id = btn.getAttribute('data-id');
                handleConnectionAction(id, action, connection.name);
            });
        });

        container.appendChild(item);
    });
}

function handleConnectionAction(id, action, name) {
    if (action === 'add') {
        alert(`Demo: Adding ${name} as a friend`);
    } else if (action === 'remove') {
        alert(`Demo: Removing ${name} from connections`);
    }
}

// Community data
const communityData = [
    {
        id: 1,
        name: 'Michael Lee',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=48&h=48&fit=crop'
    },
    {
        id: 2,
        name: 'Sophia Kim',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop'
    }
];

function renderCommunity() {
    const container = document.getElementById('communityList');
    if (!container) return;

    container.innerHTML = '';

    communityData.forEach(member => {
        const item = document.createElement('div');
        item.className = 'community-item';
        item.innerHTML = `
            <img src="${member.avatar}" alt="${member.name}" class="community-avatar">
            <div class="community-info">
                <div class="community-name">${member.name}</div>
            </div>
            <button class="community-profile-btn" data-id="${member.id}">My Profile</button>
        `;

        item.querySelector('.community-profile-btn').addEventListener('click', () => {
            alert(`Demo: Viewing ${member.name}'s profile`);
        });

        container.appendChild(item);
    });
}

function setupFriendsActions() {
    const findFriendsBtn = document.querySelector('.friends-btn-secondary');
    const inviteFriendsBtn = document.querySelector('.friends-btn-primary');
    const seeAllBtns = document.querySelectorAll('.see-all-btn');

    if (findFriendsBtn) {
        findFriendsBtn.addEventListener('click', () => {
            alert('Demo: Finding friends nearby');
        });
    }

    if (inviteFriendsBtn) {
        inviteFriendsBtn.addEventListener('click', () => {
            alert('Demo: Inviting friends to join NightGuard');
        });
    }

    seeAllBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Demo: Showing all connections/community members');
        });
    });
}
