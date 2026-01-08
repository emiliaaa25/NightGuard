document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Verificăm Sesiunea
    if(window.checkSession) checkSession();
    
    // 2. Auth Forms
    if(window.initAuthForms) initAuthForms();

    // 3. Socket
    const token = localStorage.getItem("nightguard_token");
    if(token && window.initSocketConnection) {
        window.initSocketConnection();
    }

    // --- 4. ACTIVARE SENZORI (CRITIC PENTRU SHAKE) ---
    const startBtn = document.getElementById('btn-start-app');
    
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            console.log("🖱️ User clicked START - Requesting Permissions...");
            
            // Ascundem overlay-ul
            document.getElementById('start-overlay').style.display = 'none';
            
            // Initializăm senzorii Imediat (User Interaction Context)
            if (window.nightGuardIoT) {
                await window.nightGuardIoT.init();
            } else {
                console.error("NightGuardIoT module not loaded!");
            }
        });
    }
});