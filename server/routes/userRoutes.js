const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// GET profilul utilizatorului logat
router.get('/profile', authMiddleware, userController.getProfile);

// PUT update profil
router.put('/profile', authMiddleware, userController.updateProfile);

module.exports = router;
