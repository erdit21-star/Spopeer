const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');

router.post('/register', validate.register, authController.register);
router.post('/login', validate.login, authController.login);
router.get('/profile', authController.verifyToken, authController.profile);

module.exports = router;
