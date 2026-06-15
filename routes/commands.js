const router = require('express').Router();
const { list, create, update, remove, toggle } = require('../controllers/commandsController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const commandSchema = {
    name: { required: true },
    response: { required: true }
};

router.get('/', auth, list);
router.post('/', auth, validate(commandSchema), create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
router.patch('/:id/toggle', auth, toggle);

module.exports = router;