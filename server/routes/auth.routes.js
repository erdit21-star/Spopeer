const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');

router.post('/register', validate.register, authController.register);
router.post('/signup',  validate.register, authController.register); // alias
router.post('/login',   validate.login,    authController.login);
router.get('/me',       authController.verifyToken, authController.profile); // alias
router.get('/profile',  authController.verifyToken, authController.profile);

module.exports = router;
