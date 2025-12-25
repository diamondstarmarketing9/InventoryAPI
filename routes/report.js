const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/low-stock', reportController.lowStock);
router.get('/movement-history', reportController.movementHistory);
router.get('/profit', reportController.profitReport);
router.get('/valuation', reportController.inventoryValuation);

module.exports = router;
