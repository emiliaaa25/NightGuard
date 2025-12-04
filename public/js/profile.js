// API Configuration
const API_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Load user profile
    loadUserProfile();

    // Setup event listeners
    setupEventListeners();
    
    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Profile form submit
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);

    // Add emergency contact
    const addContactBtn = document.getElementById('addContactBtn');
    const cancelContactBtn = document.getElementById('cancelContactBtn');
    const addContactModal = document.getElementById('addContactModal');
    const addContactForm = document.getElementById('addContactForm');

    addContactBtn.addEventListener('click', () => {
        addContactModal.classList.remove('hidden');
    });

    cancelContactBtn.addEventListener('click', () => {
        addContactModal.classList.add('hidden');
        addContactForm.reset();
    });

    addContactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Here you would save the contact to the database
        addContactModal.classList.add('hidden');
        addContactForm.reset();
        showMessage('Emergency contact added successfully!', 'success');
    });

    // Mobile hamburger
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to selected tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function loadUserProfile() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayUserProfile(data.user);
        } else if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else {
            showMessage('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

function displayUserProfile(user) {
    // Update profile header
    document.getElementById('profileName').textContent = user.full_name || user.username;
    document.getElementById('profileEmail').textContent = user.email;
    
    // Set avatar initials
    const initials = (user.full_name || user.username).charAt(0).toUpperCase();
    document.getElementById('avatarInitials').textContent = initials;

    // Update user type badge
    const userTypeBadge = document.getElementById('userTypeBadge');
    if (user.user_type === 'night_guardian') {
        userTypeBadge.textContent = '🛡️ Night Guardian';
        userTypeBadge.style.background = '#dcfce7';
        userTypeBadge.style.color = '#059669';
    } else {
        userTypeBadge.textContent = 'User';
    }

    // Fill form fields
    document.getElementById('fullName').value = user.full_name || '';
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone_number || '';
    document.getElementById('bio').value = user.bio || '';
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const fullName = document.getElementById('fullName').value;
    const bio = document.getElementById('bio').value;
    
    const errorDiv = document.getElementById('profileError');
    const successDiv = document.getElementById('profileSuccess');
    
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, bio })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update displayed name
            document.getElementById('profileName').textContent = data.user.full_name;
            
            // Update avatar initials
            const initials = data.user.full_name.charAt(0).toUpperCase();
            document.getElementById('avatarInitials').textContent = initials;
            
            successDiv.textContent = 'Profile updated successfully!';
            successDiv.classList.add('show');
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successDiv.classList.remove('show');
            }, 3000);
        } else {
            errorDiv.textContent = data.error || 'Failed to update profile';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function showMessage(message, type) {
    const div = document.createElement('div');
    div.className = `${type}-message show`;
    div.textContent = message;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.padding = '1rem 1.5rem';
    div.style.borderRadius = '8px';
    div.style.zIndex = '1000';
    div.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 3000);
}