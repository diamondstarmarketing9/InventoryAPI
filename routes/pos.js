const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');

router.post('/sale', posController.createSale);
router.post('/return', posController.returnSale);
router.get('/report', posController.getDailyReport);

module.exports = router;
