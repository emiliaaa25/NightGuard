/**
 * SETTINGS & CONTACTS MANAGER (CONNECTED TO DB)
 */
class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        // Form Listener for Add Contact
        const form = document.getElementById('form-add-contact');
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addContact();
            });
        }
    }

    // 1. Load Profile Data
    async loadProfile() {
        const token = localStorage.getItem("nightguard_token");
        if(!token) return;

        try {
            const response = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` }});
            if(response.ok) {
                const data = await response.json();
                if(data.user) {
                    const nameEl = document.getElementById('settings-name');
                    const emailEl = document.getElementById('settings-email');
                    if(nameEl) nameEl.innerText = data.user.fullName || data.user.username;
                    if(emailEl) emailEl.innerText = data.user.email;
                }
            }
        } catch(e) { console.error("Profile load error:", e); }
    }

    // 2. Update Dashboard Header
    updateHeader(isDashboard) {
        if(isDashboard) {
            this.loadProfile().then(() => {
                const nameEl = document.getElementById('settings-name');
                const welcomeEl = document.getElementById('welcomeTitle');
                if(nameEl && welcomeEl) {
                    const name = nameEl.innerText;
                    welcomeEl.innerText = `Hello, ${name.split(' ')[0]}`;
                }
            });
        }
    }

    // 3. Load Contacts from Database
    async loadContacts() {
        const list = document.getElementById('contacts-list');
        const token = localStorage.getItem("nightguard_token");
        if(!list || !token) return;

        list.innerHTML = '<div class="loader-ring" style="width:20px; height:20px; border-width:2px; margin:20px auto;"></div>';

        try {
            const res = await fetch('/api/user/contacts', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if(res.ok) {
                const data = await res.json();
                list.innerHTML = '';

                if(data.contacts.length === 0) {
                    list.innerHTML = '<div class="empty-state">No contacts added yet.</div>';
                    return;
                }

                data.contacts.forEach((c) => {
                    const item = document.createElement('div');
                    item.className = 'contact-item';
                    
                    // Generate initials from name
                    const initials = this.getInitials(c.name);
                    
                    // Get avatar color based on name (consistent color for same name)
                    const avatarColor = this.getAvatarColor(c.name);
                    
                    item.innerHTML = `
                        <div class="contact-item-left">
                            <div class="contact-avatar" style="background: ${avatarColor};">
                                ${initials}
                            </div>
                        <div class="contact-info">
                                <h4>${this.escapeHtml(c.name)}</h4>
                                <p class="contact-relationship">${this.escapeHtml(c.relation || 'Friend')}</p>
                                <p class="contact-phone">${this.escapeHtml(c.phone)}</p>
                            </div>
                        </div>
                        <button onclick="window.settingsManager.deleteContact(${c.id})" class="btn-delete-contact" title="Delete contact">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    `;
                    list.appendChild(item);
                });
            }
        } catch(e) { 
            console.error(e);
            list.innerHTML = '<div class="empty-state text-danger">Error loading contacts.</div>';
        }
    }

    // 4. Add Contact to Database
    async addContact() {
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        const relation = document.getElementById('contact-relation').value;
        const token = localStorage.getItem("nightguard_token");

        if(!name || !phone) return;

        try {
            const res = await fetch('/api/user/contacts', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, phone, relation })
            });

            if(res.ok) {
                document.getElementById('form-add-contact').reset();
                document.getElementById('modal-add-contact').classList.add('hidden');
                this.loadContacts(); // Refresh list
                alert("Contact saved securely.");
            } else {
                alert("Failed to save contact.");
            }
        } catch(e) { console.error(e); }
    }

    // 5. Delete Contact from Database
    async deleteContact(id) {
        if(!confirm("Remove this contact permanently?")) return;
        
        const token = localStorage.getItem("nightguard_token");
        try {
            const res = await fetch(`/api/user/contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if(res.ok) {
                this.loadContacts();
            }
        } catch(e) { console.error(e); }
    }

    // 6. Get Initials from Name
    getInitials(name) {
        if (!name) return '?';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].charAt(0).toUpperCase();
        }
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }

    // 7. Get Avatar Color (consistent for same name)
    getAvatarColor(name) {
        if (!name) return '#6b7280';
        
        // Generate a consistent color based on name
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Color palette - soft, pleasant colors
        const colors = [
            'linear-gradient(135deg, #ec4899, #db2777)', // Pink
            'linear-gradient(135deg, #3b82f6, #2563eb)', // Blue
            'linear-gradient(135deg, #10b981, #059669)', // Green
            'linear-gradient(135deg, #f59e0b, #d97706)', // Amber
            'linear-gradient(135deg, #8b5cf6, #7c3aed)', // Purple
            'linear-gradient(135deg, #ef4444, #dc2626)', // Red
            'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
            'linear-gradient(135deg, #f97316, #ea580c)', // Orange
        ];
        
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    // 8. Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const settingsManager = new SettingsManager();
window.settingsManager = settingsManager;