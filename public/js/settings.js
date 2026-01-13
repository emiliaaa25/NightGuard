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
                    item.innerHTML = `
                        <div class="contact-info">
                            <h4>${c.name}</h4>
                            <p>${c.relation || 'Friend'} • ${c.phone}</p>
                        </div>
                        <button onclick="window.settingsManager.deleteContact(${c.id})" class="btn-delete-contact">
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
}

const settingsManager = new SettingsManager();
window.settingsManager = settingsManager;