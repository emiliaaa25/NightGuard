document.addEventListener('DOMContentLoaded', () => {
    initNotifications();
});

function initNotifications() {
    setupExpandableNav();
    setupFilters();
    renderAlerts();
}

// Expandable navigation items
function setupExpandableNav() {
    const expandableItems = document.querySelectorAll('.nav-item-expandable');
    expandableItems.forEach(item => {
        const header = item.querySelector('.nav-item-header');
        const caret = item.querySelector('.nav-caret');
        
        header.addEventListener('click', () => {
            const isExpanded = item.classList.contains('expanded');
            
            // Close all other expandable items
            expandableItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('expanded');
                    otherItem.querySelector('.nav-caret').textContent = '▼';
                }
            });
            
            // Toggle current item
            if (isExpanded) {
                item.classList.remove('expanded');
                caret.textContent = '▼';
            } else {
                item.classList.add('expanded');
                caret.textContent = '▲';
            }
        });
    });
}

// Filter functionality
function setupFilters() {
    const selectAllBtn = document.getElementById('selectAllBtn');
    const unselectAllBtn = document.getElementById('unselectAllBtn');
    const checkboxes = document.querySelectorAll('.filter-checkbox');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }

    if (unselectAllBtn) {
        unselectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            // Re-render alerts with updated filters
            renderAlerts();
        });
    }

    // Filter alerts when checkboxes change
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            renderAlerts();
        });
    });
}

// Alerts data
const alertsData = [
    {
        id: 1,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop',
        name: 'John Smith',
        action: 'shared location with you',
        message: 'Stay safe out there!',
        time: '10m',
        type: 'Location Shares',
        actions: ['Acknowledge', 'Connect']
    },
    {
        id: 2,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop',
        name: 'Lisa Brown',
        action: 'sent a safety alert',
        message: 'Help is on the way!',
        time: '20m',
        type: 'Safety Alerts',
        actions: ['Acknowledge', 'Connect']
    },
    {
        id: 3,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=48&h=48&fit=crop',
        name: 'Mike Johnson',
        action: 'checked in',
        message: 'Arrived safely at destination',
        time: '1h',
        type: 'Community Check-ins',
        actions: ['Acknowledge']
    },
    {
        id: 4,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop',
        name: 'Sarah Davis',
        action: 'sent you a message',
        message: 'Are you okay? Let me know when you get home.',
        time: '2h',
        type: 'Messages',
        actions: ['Reply', 'Connect']
    },
    {
        id: 5,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop',
        name: 'Emergency Services',
        action: 'sent an emergency alert',
        message: 'Emergency response team dispatched',
        time: '3h',
        type: 'Emergency Alerts',
        actions: ['Acknowledge']
    }
];

function renderAlerts() {
    const container = document.getElementById('alertsList');
    if (!container) return;

    // Get active filters
    const activeFilters = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(cb => cb.nextElementSibling.textContent.trim());

    // Filter alerts based on active filters
    const filteredAlerts = alertsData.filter(alert => 
        activeFilters.includes(alert.type)
    );

    container.innerHTML = '';

    if (filteredAlerts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">No notifications match your filters.</p>';
        return;
    }

    filteredAlerts.forEach(alert => {
        const alertEl = document.createElement('div');
        alertEl.className = 'alert-item';
        alertEl.innerHTML = `
            <img src="${alert.avatar}" alt="${alert.name}" class="alert-avatar">
            <div class="alert-content">
                <div>
                    <span class="alert-name">${alert.name}</span>
                    <span class="alert-action"> ${alert.action}</span>
                </div>
                <p class="alert-message">${alert.message}</p>
                <div class="alert-actions">
                    ${alert.actions.map(action => 
                        `<button class="alert-action-btn" data-action="${action.toLowerCase()}">${action}</button>`
                    ).join('')}
                </div>
            </div>
            <div class="alert-meta">
                <div class="alert-time">
                    <span class="alert-time-dot"></span>
                    <span>${alert.time}</span>
                </div>
            </div>
        `;

        // Add click handlers for action buttons
        alertEl.querySelectorAll('.alert-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                handleAlertAction(alert.id, action);
            });
        });

        container.appendChild(alertEl);
    });
}

function handleAlertAction(alertId, action) {
    const alert = alertsData.find(a => a.id === alertId);
    if (!alert) return;

    switch(action) {
        case 'acknowledge':
            alert('Demo: Alert acknowledged');
            // In a real app, this would mark the alert as read
            break;
        case 'connect':
            alert(`Demo: Connecting with ${alert.name}`);
            break;
        case 'reply':
            alert(`Demo: Replying to ${alert.name}`);
            break;
        default:
            alert(`Demo: ${action} action for ${alert.name}`);
    }
}

