const express = require('express');
const { register, login, verifyEmail, resendVerifyEmail } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verify', resendVerifyEmail);

module.exports = router;