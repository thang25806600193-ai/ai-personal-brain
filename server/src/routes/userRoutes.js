const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getMe, updateProfile, updatePassword, updateAvatar } = require('../controllers/userController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File không hợp lệ. Chỉ nhận ảnh.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateProfile);
router.put('/me/password', authenticateToken, updatePassword);
router.post('/me/avatar', authenticateToken, upload.single('avatar'), updateAvatar);

module.exports = router;
