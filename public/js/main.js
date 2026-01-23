document.addEventListener('DOMContentLoaded', () => {
    
    const token = localStorage.getItem("nightguard_token");
    const bottomNav = document.getElementById("bottom-nav");
    
    if (!token && bottomNav) {
        bottomNav.style.display = 'none'; 
        bottomNav.classList.add('hidden');
    }

    if(window.checkSession) checkSession();
    if(window.initAuthForms) initAuthForms();
    
    if(token && window.initSocketConnection) {
        console.log("🔌 Initializing Socket connection...");
        window.initSocketConnection();
    }

    const startBtn = document.getElementById('btn-start-app');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            document.getElementById('start-overlay').style.display = 'none';
            if (window.nightGuardIoT) await window.nightGuardIoT.init();
        });
    }
    
    if(token && window.settingsManager) {
        window.settingsManager.loadProfile();
    }
});