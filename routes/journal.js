const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');

router.get('/', journalController.getAllEntries);
router.get('/:id', journalController.getEntryById);
router.post('/', journalController.createManualEntry); // Main creation point for MJE
router.put('/:id', journalController.updateEntry);
router.delete('/:id', journalController.deleteEntry);

module.exports = router;
