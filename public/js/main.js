document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Ascunde bara de jos dacă nu suntem logați (Cosmetic)
    const token = localStorage.getItem("nightguard_token");
    const bottomNav = document.getElementById("bottom-nav");
    
    if (!token && bottomNav) {
        bottomNav.style.display = 'none'; 
        bottomNav.classList.add('hidden');
    }

    // 2. Inițializează modulele
    if(window.checkSession) checkSession();
    if(window.initAuthForms) initAuthForms();
    
    // 3. Conectează Socket-ul (Aici e cheia comunicării)
    if(token && window.initSocketConnection) {
        console.log("🔌 Initializing Socket connection...");
        window.initSocketConnection();
    }

    // 4. Setări buton Start (dacă există)
    const startBtn = document.getElementById('btn-start-app');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            document.getElementById('start-overlay').style.display = 'none';
            if (window.nightGuardIoT) await window.nightGuardIoT.init();
        });
    }
    
    // 5. Încărcare profil în Settings (dacă e cazul)
    if(token && window.settingsManager) {
        window.settingsManager.loadProfile();
    }
});