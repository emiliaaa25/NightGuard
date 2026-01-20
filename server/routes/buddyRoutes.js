const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// 1. POST: Publică o rută nouă
router.post('/post', authenticateToken, async (req, res) => {
    const { startLat, startLng, destination, timeOffset } = req.body; // timeOffset = minute peste cat timp pleaca
    const userId = req.user.id;

    try {
        // Calculăm timpul de plecare (Acum + minute)
        const departureTime = new Date(Date.now() + timeOffset * 60000);

        await pool.query(
            "INSERT INTO route_posts (user_id, start_lat, start_lng, destination_name, departure_time) VALUES ($1, $2, $3, $4, $5)",
            [userId, startLat, startLng, destination, departureTime]
        );
        res.json({ success: true, message: "Route posted!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. GET: Găsește colegi în zonă (Simplificat)
router.get('/nearby', authenticateToken, async (req, res) => {
    const { lat, lng } = req.query; // Locația mea curentă
    
    try {
        // Luăm rutele ACTIVE din ultimele 30 min care NU sunt ale mele
        // (Pentru demo, nu facem calcul geospațial complex, doar luăm ultimele postări)
        const result = await pool.query(`
            SELECT r.id, r.destination_name, r.departure_time, u.full_name, u.avatar_url 
            FROM route_posts r
            JOIN users u ON r.user_id = u.id
            WHERE r.status = 'ACTIVE' 
            AND r.user_id != $1
            AND r.created_at > NOW() - INTERVAL '1 hour'
            ORDER BY r.created_at DESC
            LIMIT 5
        `, [req.user.id]);

        res.json({ matches: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
// ... importuri existente ...

// 3. GET: Istoricul Chat-ului
router.get('/chat/:routeId', authenticateToken, async (req, res) => {
    const { routeId } = req.params;
    try {
        const result = await pool.query(`
            SELECT m.message, m.sender_id, m.created_at, u.full_name 
            FROM buddy_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.route_id = $1
            ORDER BY m.created_at ASC
        `, [routeId]);
        
        res.json({ messages: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
// ... (celelalte rute rămân la fel) ...

// 4. GET: Cursa mea activă (Ca să pot redeschide chat-ul)
router.get('/active-walk', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // Căutăm o rută unde statusul e MATCHED sau ACTIVE
        // ȘI unde utilizatorul este fie Creator (user_id), fie Partener (buddy_id)
        const result = await pool.query(`
            SELECT r.id, r.destination_name, r.status, 
                   u.full_name as owner_name, 
                   b.full_name as buddy_name
            FROM route_posts r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users b ON r.buddy_id = b.id
            WHERE (r.user_id = $1 OR r.buddy_id = $1)
            AND r.status IN ('ACTIVE', 'MATCHED')
            AND r.created_at > NOW() - INTERVAL '2 hours'
            LIMIT 1
        `, [userId]);

        if (result.rows.length > 0) {
            res.json({ activeWalk: result.rows[0] });
        } else {
            res.json({ activeWalk: null });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/end-walk', authenticateToken, async (req, res) => {
    const { routeId } = req.body;
    const userId = req.user.id;

    try {
        // Actualizăm statusul în COMPLETED doar dacă userul face parte din cursă
        await pool.query(
            "UPDATE route_posts SET status = 'COMPLETED' WHERE id = $1 AND (user_id = $2 OR buddy_id = $2)",
            [routeId, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;