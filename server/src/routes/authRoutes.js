/**
 * Auth Routes
 * Refactored with DI Container and Input Validation
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');

const createAuthRoutes = (container) => {
  const router = express.Router();
  const authController = container.getAuthController();

  const googleAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: 'Too many Google login attempts, please try again later.',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post('/register', validateRegister, authController.register);
  router.post('/login', validateLogin, authController.login);
  router.post('/google', googleAuthLimiter, authController.googleLogin);
  router.get('/verify-email', authController.verifyEmail);
  router.post('/resend-verify', authController.resendVerifyEmail);

  return router;
};

module.exports = createAuthRoutes;