const router = require('express').Router();
const { getSettings, updateSettings, updateSetting } = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getSettings);
router.put('/', auth, updateSettings);
router.put('/:key', auth, updateSetting);

module.exports = router;