const router = require('express').Router();
const { getChats, getMessages, sendMessage } = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getChats);
router.get('/:jid/messages', auth, getMessages);
router.post('/:jid/send', auth, sendMessage);

module.exports = router;