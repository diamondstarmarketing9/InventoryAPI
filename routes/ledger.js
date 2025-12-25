const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');

router.get('/', ledgerController.getGeneralLedger);
router.get('/trial-balance', ledgerController.getTrialBalance);

module.exports = router;
