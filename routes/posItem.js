const express = require('express');
const router = express.Router();
const posSaleItemController = require('../controllers/posSaleItemController');

router.get('/', posSaleItemController.getAllItems);
router.get('/:id', posSaleItemController.getItemById);
router.put('/:id', posSaleItemController.updateItem);
router.delete('/:id', posSaleItemController.deleteItem);

module.exports = router;
