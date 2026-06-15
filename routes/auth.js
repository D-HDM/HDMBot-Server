const router = require('express').Router();
const { register, login, getMe, updateProfile, refreshToken, logout } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const registerSchema = {
    username: { required: true, minLength: 3, maxLength: 30 },
    email: { required: true },
    password: { required: true, minLength: 6, maxLength: 128 }
};

const loginSchema = {
    email: { required: true },
    password: { required: true }
};

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.post('/refresh', refreshToken);
router.post('/logout', auth, logout);

module.exports = router;