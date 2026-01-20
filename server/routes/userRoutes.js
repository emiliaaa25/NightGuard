const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Verificăm dacă controller-ul este încărcat corect (Debugging)
if (!userController.getProfile) {
    console.error("❌ EROARE: userController nu este încărcat corect în userRoutes.js!");
}

// --- RUTELE ---

// 1. Profil & Locație
router.get('/profile', authMiddleware, userController.getProfile);
router.post('/location', authMiddleware, userController.updateLocation);
router.post('/toggle-guardian', authMiddleware, userController.toggleGuardian);

// 2. Aplicare (Civili)
router.post('/apply', authMiddleware, userController.applyForGuardian);

// 3. Admin (Aprobare)
router.get('/applicants', authMiddleware, userController.getApplicants);
router.post('/approve', authMiddleware, userController.approveGuardian);
router.post('/reject', authMiddleware, userController.rejectGuardian);

router.get('/history', authMiddleware, userController.getAlertHistory);
router.get('/contacts', authMiddleware, userController.getContacts); 

// 2. ADD Contact
router.post('/contacts', authMiddleware, userController.addContact);

// 3. DELETE Contact
router.delete('/contacts/:id', authMiddleware, userController.deleteContact);

module.exports = router;
