const pool = require('../config/db');

// --- 1. HANDLE PANIC (GPS + WebSockets) ---
const handlePanicAlert = async (req, res) => {
    const { latitude, longitude, trigger_method } = req.body;
    const userId = req.user.id;
    
    // Access Socket.IO
    const io = req.app.get('io');

    console.log(`[IoT ALERT] User ${userId} triggered SOS via ${trigger_method} at ${latitude}, ${longitude}`);

    try {
        // A. Save alert to DB
        const alertResult = await pool.query(
            "INSERT INTO alerts (user_id, type, latitude, longitude, status, source, trigger_method) VALUES ($1, 'SOS', $2, $3, 'ACTIVE', 'USER_APP', $4) RETURNING id",
            [userId, latitude, longitude, trigger_method]
        );

        // B. Get victim name
        const userRes = await pool.query("SELECT full_name, phone FROM users WHERE id = $1", [userId]);
        const victimName = userRes.rows[0].full_name;

        // C. Search for Guardians nearby (approx 5-10km logic)
        const guardiansQuery = `
            SELECT id, full_name FROM users 
            WHERE is_guardian = true 
            AND id != $1
            AND last_seen > NOW() - INTERVAL '1 HOUR'
            AND last_latitude BETWEEN $2 - 0.1 AND $2 + 0.1
            AND last_longitude BETWEEN $3 - 0.1 AND $3 + 0.1
        `;

        const guardiansResult = await pool.query(guardiansQuery, [userId, latitude, longitude]);
        const guardians = guardiansResult.rows;

        console.log(`Found ${guardians.length} active guardians. Notifying them now...`);

        // D. Send WebSocket notification to guardians
        // REMOVED EMOJI from message
        guardians.forEach(guardian => {
            io.to(`user_${guardian.id}`).emit('emergency_alert', {
                alertId: alertResult.rows[0].id,
                victimId: userId,  // Add victim ID
                victimName: victimName,
                distance: "Nearby",
                location: { lat: latitude, lng: longitude },
                message: `SOS ALERT: ${victimName} needs help nearby!` 
            });
            console.log(`-> Notification sent to Guardian ${guardian.full_name}`);
        });

        res.json({
            success: true,
            alertId: alertResult.rows[0].id,
            guardiansNotified: guardians.length,
            audioRecording: true,
            message: "SOS Protocol Initiated"
        });

    } catch (err) {
        console.error("IoT Controller Error:", err);
        res.status(500).json({ error: 'IoT System Failure' });
    }
};

// --- 2. HANDLE AUDIO UPLOAD ---
const handleAudioUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file received" });
        }

        const alertId = req.body.alertId; 
        const filename = req.file.filename;

        // REMOVED EMOJI from console log
        console.log(`[AUDIO] Evidence Received for Alert ${alertId}: ${filename}`);

        // Update DB with filename
        await pool.query(
            "UPDATE alerts SET audio_url = $1 WHERE id = $2",
            [filename, alertId]
        );

        res.json({ success: true, message: "Evidence secured" });

    } catch (err) {
        console.error("Audio Upload Error:", err);
        res.status(500).json({ error: "Failed to save evidence" });
    }
};
// controllers/iotController.js

const reportHazard = async (req, res) => {
    // 1. Extragem datele din body
    const { latitude, longitude, type, description } = req.body;
    
    // 2. Extragem ID-ul userului din token (req.user vine din middleware)
    const userId = req.user.id; 

    console.log(`📝 Reporting Hazard: ${type} at ${latitude}, ${longitude} by User ${userId}`);

    try {
        await pool.query(
            "INSERT INTO safety_reports (user_id, latitude, longitude, type, description) VALUES ($1, $2, $3, $4, $5)",
            [userId, latitude, longitude, type, description]
        );
        res.json({ success: true, message: "Hazard reported. Community warned." });
    } catch (err) {
        console.error("❌ DB Error:", err);
        res.status(500).json({ error: "Failed to report hazard" });
    }
};
// --- SAFEROUTE: GET SAFETY MAP DATA ---
const getSafetyMapData = async (req, res) => {
    try {
        // SQL Corect (fără ' la final)
        const reports = await pool.query(
            "SELECT latitude, longitude, type, description, created_at FROM safety_reports"
        );
        res.json({ hazards: reports.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch safety data" });
    }
};


module.exports = {
    handlePanicAlert,
    handleAudioUpload,
    reportHazard,
    getSafetyMapData
};