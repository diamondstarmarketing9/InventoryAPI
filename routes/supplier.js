const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
// const { authenticate, authorize } = require('../middleware/auth'); // Assuming auth is desired

// router.use(authenticate); // Application level auth usually, but let's assume open or middleware is applied in server
// For now, I'll define routes.

router.post('/', supplierController.createSupplier);
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
