const router = require('express').Router();
const { list, get, create, update, remove, block } = require('../controllers/contactController');
const { auth } = require('../middleware/auth');

router.get('/', auth, list);
router.get('/:id', auth, get);
router.post('/', auth, create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
router.patch('/:id/block', auth, block);

module.exports = router;