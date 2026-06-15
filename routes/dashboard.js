const router = require('express').Router();
const { getOverview } = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

router.get('/overview', auth, getOverview);

module.exports = router;