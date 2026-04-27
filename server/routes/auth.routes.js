const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/signup',   authController.register);
router.post('/register', authController.register);
router.post('/login',    authController.login);
router.get('/me',        authController.verifyToken, authController.profile);
router.get('/profile',   authController.verifyToken, authController.profile);

module.exports = router;
