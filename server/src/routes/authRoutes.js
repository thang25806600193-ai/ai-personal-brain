/**
 * Auth Routes
 * Refactored with DI Container and Input Validation
 */

const express = require('express');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');

const createAuthRoutes = (container) => {
  const router = express.Router();
  const authController = container.getAuthController();

  router.post('/register', validateRegister, authController.register);
  router.post('/login', validateLogin, authController.login);
  router.post('/google', authController.googleLogin);
  router.get('/verify-email', authController.verifyEmail);
  router.post('/resend-verify', authController.resendVerifyEmail);

  return router;
};

module.exports = createAuthRoutes;