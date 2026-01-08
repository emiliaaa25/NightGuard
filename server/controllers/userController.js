const pool = require('../config/db');

// --- 1. PROFIL & LOCAȚIE ---

// Obține profilul userului (inclusiv rolul)
exports.getProfile = async (req, res) => {
    try {
        // Returnăm datele userului + rolul
        const result = await pool.query('SELECT id, full_name, username, email, is_guardian, role FROM users WHERE id = $1', [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Server Error' }); 
    }
};

// Update Locație (Heartbeat pentru gardieni)
exports.updateLocation = async (req, res) => {
    const { latitude, longitude } = req.body;
    try {
        await pool.query(
            'UPDATE users SET last_latitude = $1, last_longitude = $2, last_seen = NOW() WHERE id = $3',
            [latitude, longitude, req.user.id]
        );
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Location update failed' }); 
    }
};

// Toggle ON/OFF DUTY (Doar pentru SECURITY sau ADMIN)
exports.toggleGuardian = async (req, res) => {
    try {
        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        const role = userCheck.rows[0].role;

        // Verificare strictă de rol
        if (role !== 'SECURITY' && role !== 'ADMIN' && role !== 'POLICE') {
            return res.status(403).json({ error: 'Unauthorized: You are not a verified Guardian.' });
        }

        const result = await pool.query(
            'UPDATE users SET is_guardian = NOT is_guardian WHERE id = $1 RETURNING is_guardian',
            [req.user.id]
        );
        res.json({ is_guardian: result.rows[0].is_guardian });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Switch failed' }); 
    }
};

// --- 2. SISTEM DE APLICARE (CIVILI) ---

exports.applyForGuardian = async (req, res) => {
    const { phone, reason, experience } = req.body;
    
    if (!phone ||  !reason) {
        return res.status(400).json({ error: "Toate câmpurile sunt obligatorii." });
    }

    try {
        await pool.query(
            "UPDATE users SET role = 'PENDING', phone = $1, application_reason = $2, experience = $3 WHERE id = $4",
            [phone, reason, experience, req.user.id]
        );
        res.json({ success: true, message: "Aplicație trimisă." });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Application failed" }); 
    }
};

// --- 3. SISTEM ADMIN (APROBARE/RESPINGERE) ---

exports.getApplicants = async (req, res) => {
    try {
        const adminCheck = await pool.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
        if (adminCheck.rows[0].role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" });

        const result = await pool.query("SELECT id, full_name, email, phone, application_reason, experience FROM users WHERE role = 'PENDING'");
        res.json({ applicants: result.rows });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Server error" }); 
    }
};

exports.approveGuardian = async (req, res) => {
    const { applicantId } = req.body;
    try {
        const adminCheck = await pool.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
        if (adminCheck.rows[0].role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" });

        // Promovăm userul la SECURITY
        await pool.query("UPDATE users SET role = 'SECURITY' WHERE id = $1", [applicantId]);
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Approval failed" }); 
    }
};

exports.rejectGuardian = async (req, res) => {
    const { applicantId } = req.body;
    try {
        const adminCheck = await pool.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
        if (adminCheck.rows[0].role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" });

        // Retrogradăm userul la USER simplu
        await pool.query("UPDATE users SET role = 'USER' WHERE id = $1", [applicantId]);
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Rejection failed" }); 
    }
};
exports.getAlertHistory = async (req, res) => {
    try {
        // Luăm ultimele 20 de alerte ale userului logat
        const result = await pool.query(
            "SELECT id, type, created_at, audio_url, latitude, longitude FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
            [req.user.id]
        );
        res.json({ history: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Nu am putut încărca istoricul." });
    }
};