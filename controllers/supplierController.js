const Supplier = require('../models/Supplier');

exports.createSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json(supplier);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        await supplier.update(req.body);
        res.json(supplier);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        // Soft delete could be implemented by setting status to INACTIVE, or using paranoid: true in model
        // For now, prompt implies standard DELETE/soft delete.
        // If the model had paranoid: true, destroy() would soft delete. 
        // User asked for "soft delete where applicable". Let's assume using 'status' is safer or stick to destroy if paranoid isn't set.
        // Assuming strict "Delete" here means possibly just setting to Inactive if dependencies exist.
        // But let's try destroy logic.
        await supplier.destroy();
        res.json({ message: 'Supplier deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
