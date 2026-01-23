const pool = require('../config/db');

// --- 1. PROFIL 
exports.getProfile = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name, username, email, phone, is_guardian, role FROM users WHERE id = $1', [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: 'Server Error' }); 
    }
};

// Update Locație 
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

// Toggle ON/OFF DUTY 
exports.toggleGuardian = async (req, res) => {
    try {
        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        const role = userCheck.rows[0].role;

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

//2. SISTEM DE APLICARE 
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

//3. SISTEM ADMIN 

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

        await pool.query("UPDATE users SET role = 'USER' WHERE id = $1", [applicantId]);
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Rejection failed" }); 
    }
};
exports.getAlertHistory = async (req, res) => {
    try {
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

//4. GESTIUNE CONTACTE DE URGENȚĂ

exports.getContacts = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ contacts: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.addContact = async (req, res) => {
    const { name, phone, relation } = req.body;
    
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

    try {
        const result = await pool.query(
            'INSERT INTO emergency_contacts (user_id, name, phone, relation) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, name, phone, relation]
        );
        res.json({ contact: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.deleteContact = async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};