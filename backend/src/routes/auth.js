// backend/src/routes/auth.js
const express = require('express');

const { register, login } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Returns the identity carried by the presented token.
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({ data: req.user });
});

module.exports = router;