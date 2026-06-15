const router = require('express').Router();
const { list, create, update, remove, toggle } = require('../controllers/rulesController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const ruleSchema = {
    trigger: { required: true },
    response: { required: true }
};

router.get('/', auth, list);
router.post('/', auth, validate(ruleSchema), create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
router.patch('/:id/toggle', auth, toggle);

module.exports = router;