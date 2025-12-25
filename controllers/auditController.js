const StockBalance = require('../models/StockBalance');
const StockMovement = require('../models/StockMovement');

exports.auditStock = async (req, res) => {
    const { productId, locationId, physicalCount, remarks } = req.body;

    try {
        let stock = await StockBalance.findOne({ where: { ProductId: productId, LocationId: locationId } });
        if (!stock) {
            stock = await StockBalance.create({ ProductId: productId, LocationId: locationId, quantity: physicalCount });
        } else {
            const diff = physicalCount - stock.quantity;
            stock.quantity = physicalCount;
            await stock.save();

            await StockMovement.create({
                ProductId: productId,
                toLocationId: locationId,
                quantity: diff,
                type: 'ADJUSTMENT',
                remarks
            });
        }

        res.json({ message: 'Audit recorded successfully', stock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
