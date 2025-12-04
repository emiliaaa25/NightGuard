const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Helper: generare JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
};

// Register
exports.register = async (req, res) => {
    const { username, email, fullName, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }

    try {
        // Verificare duplicate
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email=$1 OR username=$2',
            [email, username]
        );
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email or username already exists' });
        }

        // Hash parola
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (username, email, password, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name',
            [username, email, hashedPassword, fullName]
        );

        const user = result.rows[0];
        const token = generateToken(user);

        res.status(201).json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);

        res.json({
            user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
