const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

if (!userController.getProfile) {
    console.error("❌ EROARE: userController nu este încărcat corect în userRoutes.js!");
}

router.get('/profile', authMiddleware, userController.getProfile);
router.post('/location', authMiddleware, userController.updateLocation);
router.post('/toggle-guardian', authMiddleware, userController.toggleGuardian);
router.post('/apply', authMiddleware, userController.applyForGuardian);
router.get('/applicants', authMiddleware, userController.getApplicants);
router.post('/approve', authMiddleware, userController.approveGuardian);
router.post('/reject', authMiddleware, userController.rejectGuardian);

router.get('/history', authMiddleware, userController.getAlertHistory);
router.get('/contacts', authMiddleware, userController.getContacts); 
router.post('/contacts', authMiddleware, userController.addContact);
router.delete('/contacts/:id', authMiddleware, userController.deleteContact);

module.exports = router;
