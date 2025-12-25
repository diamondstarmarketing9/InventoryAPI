const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.post('/receive', stockController.receiveStock);
router.post('/transfer', stockController.transferStock);
router.post('/sale', stockController.saleStock);
router.post('/produce', stockController.produceStock);

module.exports = router;
