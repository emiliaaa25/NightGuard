const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/post', authenticateToken, async (req, res) => {
    const { startLat, startLng, destination, timeOffset } = req.body; 
    const userId = req.user.id;

    try {
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

router.get('/nearby', authenticateToken, async (req, res) => {
    const { lat, lng } = req.query; 

    try {
        const result = await pool.query(`
            SELECT r.id, r.destination_name, r.departure_time, u.id as user_id, u.full_name, u.avatar_url,
                   COALESCE( ROUND( (SELECT AVG(stars) FROM user_ratings ur WHERE ur.target_id = u.id)::numeric, 1), 0) as avg_rating
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

router.get('/active-walk', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT r.id, r.destination_name, r.status, 
                   u.id as owner_id, u.full_name as owner_name, 
                   b.id as buddy_id, b.full_name as buddy_name
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

router.post('/rate', authenticateToken, async (req, res) => {
    const reviewerId = req.user.id;
    const { targetId, stars, comment } = req.body;

    if (!targetId || !stars) return res.status(400).json({ error: 'targetId and stars are required' });

    try {
        await pool.query(
            `INSERT INTO user_ratings (reviewer_id, target_id, stars, comment) VALUES ($1, $2, $3, $4)`,
            [reviewerId, targetId, stars, comment || null]
        );

        const avgRes = await pool.query(`SELECT COALESCE(ROUND(AVG(stars)::numeric,1),0) as avg_rating FROM user_ratings WHERE target_id = $1`, [targetId]);

        res.json({ success: true, avg: avgRes.rows[0].avg_rating });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/end-walk', authenticateToken, async (req, res) => {
    const { routeId } = req.body;
    const userId = req.user.id;

    try {
        const routeRes = await pool.query(`SELECT id, user_id, buddy_id FROM route_posts WHERE id = $1 LIMIT 1`, [routeId]);
        if (routeRes.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
        const route = routeRes.rows[0];

        if (parseInt(route.user_id) !== parseInt(userId) && parseInt(route.buddy_id) !== parseInt(userId)) {
            return res.status(403).json({ error: 'Not authorized for this route' });
        }

        let partnerId = null;
        if (parseInt(route.user_id) === parseInt(userId)) {
            partnerId = route.buddy_id || null;
        } else {
            partnerId = route.user_id || null;
        }

        await pool.query(
            "UPDATE route_posts SET status = 'COMPLETED' WHERE id = $1",
            [routeId]
        );

        let partnerName = null;
        if (partnerId) {
            const pRes = await pool.query('SELECT id, full_name FROM users WHERE id = $1', [partnerId]);
            if (pRes.rows.length > 0) partnerName = pRes.rows[0].full_name;
        }

        res.json({ success: true, partnerId: partnerId, partnerName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;