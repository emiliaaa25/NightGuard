const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const authMiddleware = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '.webm';
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'audio-' + req.user.id + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });


router.post('/panic', authMiddleware, iotController.handlePanicAlert);
router.post('/upload-evidence', authMiddleware, upload.single('audio'), iotController.handleAudioUpload);

router.post('/report', authMiddleware, iotController.reportHazard);
router.get('/safety-map', authMiddleware, iotController.getSafetyMapData);
module.exports = router;