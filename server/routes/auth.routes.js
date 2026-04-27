const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');

router.get('/register', (req, res) => res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use: POST /api/auth/register with JSON body { firstName, lastName, email, password, role }' } }));
router.get('/signup',  (req, res) => res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use: POST /api/auth/signup with JSON body { firstName, lastName, email, password, role }' } }));
router.get('/login',   (req, res) => res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use: POST /api/auth/login with JSON body { email, password }' } }));

router.post('/register', validate.register, authController.register);
router.post('/signup',  validate.register, authController.register); // alias
router.post('/login',   validate.login,    authController.login);
router.get('/me',       authController.verifyToken, authController.profile); // alias
router.get('/profile',  authController.verifyToken, authController.profile);

module.exports = router;
