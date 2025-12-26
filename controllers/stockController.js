const StockBalance = require('../models/StockBalance');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Location = require('../models/Location');
const StockMaster = require('../models/StockMaster');
const PriceHistory = require('../models/PriceHistory');
const sequelize = require('../config/db');
const socket = require('../socket');

// Helper to update Stock Master
const updateStockMaster = async (productId, qtyChange, newUnitCost, transaction) => {
    let master = await StockMaster.findOne({ where: { ProductId: productId }, transaction });
    if (!master) {
        master = await StockMaster.create({ ProductId: productId, totalQuantity: 0, averageCost: 0 }, { transaction });
    }

    // Update WAC if it's a purchase (positive qty change + cost provided)
    if (qtyChange > 0 && newUnitCost) {
        const currentVal = master.totalQuantity * parseFloat(master.averageCost || 0);
        const addedVal = qtyChange * parseFloat(newUnitCost);
        const newTotalQty = master.totalQuantity + qtyChange;
        if (newTotalQty > 0) {
            master.averageCost = (currentVal + addedVal) / newTotalQty;
        }
    }

    master.totalQuantity += qtyChange;
    master.lastUpdated = new Date();
    await master.save({ transaction });
    return master.averageCost;
};

// Helper to log Price History
const logPriceHistory = async (productId, price, type, source, transaction) => {
    await PriceHistory.create({
        ProductId: productId,
        price,
        type,
        source
    }, { transaction });
};

exports.receiveStock = async (req, res) => {
    const { productId, locationId, quantity, unitCost, supplierId, remarks } = req.body;
    const t = await sequelize.transaction();

    try {
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) throw new Error('Product not found');

        // 1. Update Location-Specific Balance
        let stock = await StockBalance.findOne({ where: { ProductId: productId, LocationId: locationId }, transaction: t });
        if (!stock) {
            stock = await StockBalance.create({ ProductId: productId, LocationId: locationId, quantity: 0 }, { transaction: t });
        }
        stock.quantity += quantity;
        await stock.save({ transaction: t });

        // 2. Update Stock Master (Total Qty & WAC)
        const newWac = await updateStockMaster(productId, quantity, unitCost, t);

        // 3. Update Product Reference Price (Optional, but good for quick access)
        await product.update({ purchasePrice: newWac }, { transaction: t });

        // 4. Record Price History
        if (unitCost) {
            await logPriceHistory(productId, unitCost, 'PURCHASE', `Supplier Receipt ${supplierId || ''}`, t);
        }

        // 5. Audit Trail
        await StockMovement.create({
            ProductId: productId,
            toLocationId: locationId,
            type: 'PURCHASE',
            quantity: quantity,
            unitCost: unitCost || newWac,
            UserId: req.user ? req.user.id : null,
            remarks: remarks || `Supplier ID: ${supplierId}`
        }, { transaction: t });

        await t.commit();
        try {
            const io = socket.getIO();
            io.to(`location_${locationId}`).emit('stock_updated', {
                type: 'RECEIVE',
                productId,
                locationId,
                newQuantity: stock.quantity
            });
        } catch (e) { console.error('Socket emit failed', e); }
        res.json({ message: 'Stock received successfully', stock, averageCost: newWac });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.transferStock = async (req, res) => {
    const { productId, fromLocationId, toLocationId, quantity, remarks } = req.body;
    const t = await sequelize.transaction();

    try {
        let fromStock = await StockBalance.findOne({ where: { ProductId: productId, LocationId: fromLocationId }, transaction: t });
        if (!fromStock || fromStock.quantity < quantity) {
            throw new Error('Insufficient stock at source location');
        }

        fromStock.quantity -= quantity;
        await fromStock.save({ transaction: t });

        let toStock = await StockBalance.findOne({ where: { ProductId: productId, LocationId: toLocationId }, transaction: t });
        if (!toStock) {
            toStock = await StockBalance.create({ ProductId: productId, LocationId: toLocationId, quantity }, { transaction: t });
        } else {
            toStock.quantity += quantity;
            await toStock.save({ transaction: t });
        }

        await StockMovement.create({
            ProductId: productId,
            fromLocationId,
            toLocationId,
            quantity,
            type: 'TRANSFER',
            UserId: req.user ? req.user.id : null,
            remarks
        }, { transaction: t });

        await t.commit();
        try {
            const io = socket.getIO();
            io.to(`location_${fromLocationId}`).emit('stock_updated', { productId, locationId: fromLocationId, type: 'TRANSFER_OUT' });
            io.to(`location_${toLocationId}`).emit('stock_updated', { productId, locationId: toLocationId, type: 'TRANSFER_IN' });
        } catch (e) { console.error('Socket emit failed', e); }
        res.json({ message: 'Stock transferred successfully' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.saleStock = async (req, res) => {
    const { productId, locationId, quantity, sellingPrice, remarks } = req.body;
    const t = await sequelize.transaction();

    try {
        const product = await Product.findByPk(productId, { transaction: t });
        let stock = await StockBalance.findOne({ where: { ProductId: productId, LocationId: locationId }, transaction: t });

        if (!stock || stock.quantity < quantity) {
            throw new Error('Insufficient stock');
        }

        stock.quantity -= quantity;
        await stock.save({ transaction: t });

        // Update Stock Master (reduce qty)
        await updateStockMaster(productId, -quantity, null, t);

        // Record Sale
        // COGS = product.purchasePrice * quantity
        // Profit is calculated in reports usually, but we store unitCost here for point-in-time accuracy

        await StockMovement.create({
            ProductId: productId,
            fromLocationId: locationId,
            quantity,
            type: 'SALE',
            unitCost: product.purchasePrice, // Store current WAC as effective cost
            unitPrice: sellingPrice || product.sellingPrice,
            UserId: req.user ? req.user.id : null,
            remarks
        }, { transaction: t });

        await t.commit();
        try {
            const io = socket.getIO();
            io.to(`location_${locationId}`).emit('stock_updated', { productId, locationId, newQuantity: stock.quantity, type: 'SALE' });
        } catch (e) { console.error('Socket emit failed', e); }
        res.json({ message: 'Sale recorded successfully' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.produceStock = async (req, res) => {
    const { finishedProductId, locationId, quantity, components } = req.body;
    // components = [{ productId: 1, quantity: 5 }, { productId: 2, quantity: 2 }]

    const t = await sequelize.transaction();
    try {
        // 1. Deduct Raw Materials
        let totalProductionCost = 0;

        for (const comp of components) {
            let materialStock = await StockBalance.findOne({ where: { ProductId: comp.productId, LocationId: locationId }, transaction: t });
            if (!materialStock || materialStock.quantity < comp.quantity) {
                throw new Error(`Insufficient stock for component ID ${comp.productId}`);
            }

            // Get material cost for calculation
            const materialProduct = await Product.findByPk(comp.productId, { transaction: t });
            totalProductionCost += (parseFloat(materialProduct.purchasePrice) * comp.quantity);

            materialStock.quantity -= comp.quantity;
            await materialStock.save({ transaction: t });

            // Log material usage
            await StockMovement.create({
                ProductId: comp.productId,
                fromLocationId: locationId,
                type: 'PRODUCTION_USAGE', // Special type for raw material consumption
                quantity: comp.quantity,
                unitCost: materialProduct.purchasePrice,
                UserId: req.user ? req.user.id : null,
                remarks: `Used for printing Product ${finishedProductId}`
            }, { transaction: t });
        }

        // 2. Add Finished Product
        let finishedStock = await StockBalance.findOne({ where: { ProductId: finishedProductId, LocationId: locationId }, transaction: t });
        if (!finishedStock) {
            finishedStock = await StockBalance.create({ ProductId: finishedProductId, LocationId: locationId, quantity: 0 }, { transaction: t });
        }
        finishedStock.quantity += quantity;
        await finishedStock.save({ transaction: t });

        // Calculate Cost Per Unit of finished good
        const costPerUnit = totalProductionCost / quantity;
        const finishedProduct = await Product.findByPk(finishedProductId, { transaction: t });

        // Update WAC for finished product
        await updateWeightedAverageCost(finishedProduct, quantity, costPerUnit, t);

        await StockMovement.create({
            ProductId: finishedProductId,
            toLocationId: locationId,
            type: 'PRODUCTION', // Finished good entry
            quantity: quantity,
            unitCost: costPerUnit,
            UserId: req.user ? req.user.id : null,
            remarks: 'Manufactured'
        }, { transaction: t });

        await t.commit();
        try {
            const io = socket.getIO();
            io.to(`location_${locationId}`).emit('stock_updated', { productId: finishedProductId, locationId, newQuantity: finishedStock.quantity, type: 'PRODUCTION' });
        } catch (e) { console.error('Socket emit failed', e); }
        res.json({ message: 'Production recorded successfully', costPerUnit });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStockBalances = async (req, res) => {
    try {
        const { locationId, productId } = req.query;
        const where = {};
        if (locationId) where.LocationId = locationId;
        if (productId) where.ProductId = productId;
        const stocks = await StockBalance.findAll({ where });
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStockMovements = async (req, res) => {
    try {
        const { locationId, productId, type, start, end } = req.query;
        const where = {};
        if (locationId) where[sequelize.Op.or] = [{ fromLocationId: locationId }, { toLocationId: locationId }];
        if (productId) where.ProductId = productId;
        if (type) where.type = type;
        if (start && end) where.createdAt = { [sequelize.Op.between]: [start, end] };

        const movements = await StockMovement.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(movements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.adjustStock = async (req, res) => {
    const { productId, locationId, quantity, type, remarks } = req.body;
    // type: 'ADJUSTMENT' (usually + or - quantity. If user sends absolute, we must calc diff. Assuming delta qty here for simplicity)
    const t = await sequelize.transaction();
    try {
        let stock = await StockBalance.findOne({ where: { ProductId: productId, LocationId: locationId }, transaction: t });
        if (!stock) {
            // If adjusting positive, create. If negative, error?
            if (quantity < 0) throw new Error('Cannot deduct from non-existent stock');
            stock = await StockBalance.create({ ProductId: productId, LocationId: locationId, quantity: 0 }, { transaction: t });
        }

        stock.quantity += parseFloat(quantity);
        if (stock.quantity < 0) throw new Error('Resulting stock cannot be negative');
        await stock.save({ transaction: t });

        // Update Master
        await updateStockMaster(productId, quantity, null, t);

        await StockMovement.create({
            ProductId: productId,
            fromLocationId: quantity < 0 ? locationId : null,
            toLocationId: quantity > 0 ? locationId : null,
            type: 'ADJUSTMENT',
            quantity: Math.abs(quantity),
            unitCost: 0, // Adjustment usually has 0 cost impact unless specified
            UserId: req.user ? req.user.id : null,
            remarks
        }, { transaction: t });

        await t.commit();
        try {
            const io = socket.getIO();
            const locId = quantity < 0 ? locationId : (quantity > 0 ? locationId : null);
            if (locId) io.to(`location_${locId}`).emit('stock_updated', { productId, locationId: locId, type: 'ADJUSTMENT' });
        } catch (e) { console.error('Socket emit failed', e); }
        res.json({ message: 'Stock adjusted' });
    } catch (error) {
        await t.rollback();
        res.status(400).json({ error: error.message });
    }
};
