const pool = require('../config/db'); // conexiunea la PostgreSQL

// GET profilul utilizatorului logat
exports.getProfile = async (req, res) => {
    const userId = req.user.id; // setat de authMiddleware
    try {
        const result = await pool.query('SELECT id, username, email, full_name, bio FROM users WHERE id=$1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// PUT update profil
exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { fullName, bio } = req.body;

    try {
        const result = await pool.query(
            'UPDATE users SET full_name=$1, bio=$2, updated_at=NOW() WHERE id=$3 RETURNING id, username, email, full_name, bio',
            [fullName, bio, userId]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
