const POS_SaleItem = require('../models/POS_SaleItem');

exports.getItemById = async (req, res) => {
    try {
        const item = await POS_SaleItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateItem = async (req, res) => {
    try {
        // Warning: Changing sold item details might mess up reports unless COGS/Stock is adjusted.
        // For now, standard CRUD logic as requested.
        const item = await POS_SaleItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        await item.update(req.body);
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const item = await POS_SaleItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        // Warning: This should ideally restore stock.
        await item.destroy();
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllItems = async (req, res) => {
    try {
        const items = await POS_SaleItem.findAll({ limit: 100, order: [['createdAt', 'DESC']] });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
