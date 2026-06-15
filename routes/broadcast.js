const router = require('express').Router();
const { send, history } = require('../controllers/broadcastController');
const { auth } = require('../middleware/auth');

router.post('/', auth, send);
router.get('/history', auth, history);

module.exports = router;