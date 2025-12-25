const express = require('express');
const router = express.Router();
const chartOfAccountController = require('../controllers/chartOfAccountController');

router.post('/', chartOfAccountController.createAccount);
router.get('/', chartOfAccountController.getAllAccounts);
router.get('/:id', chartOfAccountController.getAccountById);
router.put('/:id', chartOfAccountController.updateAccount);
router.delete('/:id', chartOfAccountController.deleteAccount);

module.exports = router;
