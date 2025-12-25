const POS_Sale = require('../models/POS_Sale');
const POS_SaleItem = require('../models/POS_SaleItem');
const Product = require('../models/Product');
const StockBalance = require('../models/StockBalance');
const StockMovement = require('../models/StockMovement');
const StockMaster = require('../models/StockMaster');
const Client = require('../models/Client');
const Journal = require('../models/Journal');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

exports.createSale = async (req, res) => {
    const { locationId, items, paymentMethod, discount: globalDiscount, tax: globalTax } = req.body;
    // items: [{ productId, quantity, discount, tax }]

    const t = await sequelize.transaction();

    try {
        // 1. Validate Stock & Calculate Totals
        let calculatedTotal = 0;
        let saleItemsData = [];

        for (let item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            if (!product) throw new Error(`Product ${item.productId} not found`);

            const stock = await StockBalance.findOne({ where: { ProductId: item.productId, LocationId: locationId }, transaction: t });

            if (!stock || stock.quantity < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.nameEn} (Requested: ${item.quantity}, Available: ${stock ? stock.quantity : 0})`);
            }

            // Calculation Logic
            // LineTotal = (SellingPrice * Qty) - ItemDiscount + ItemTax
            const sellingPrice = parseFloat(product.sellingPrice);
            const itemDiscount = parseFloat(item.discount || 0);
            const itemTax = parseFloat(item.tax || 0);
            const lineTotal = (sellingPrice * item.quantity) - itemDiscount + itemTax;

            calculatedTotal += lineTotal;

            saleItemsData.push({
                ProductId: item.productId,
                quantity: item.quantity,
                unitPrice: sellingPrice,
                totalPrice: lineTotal,
                costPrice: product.purchasePrice, // Capture Current WAC
                discount: itemDiscount,
                tax: itemTax
            });
        }

        // Apply Global Sale Discount/Tax if any (simplified logic: just add to total)
        // Adjust calculatedTotal based on global modifiers if needed, for now assuming pre-calculated line items + global fields for record

        // 2. Create POS Sale Header
        const sale = await POS_Sale.create({
            LocationId: locationId,
            UserId: req.user ? req.user.id : null,
            ClientId: req.body.clientId || null, // Capture Client
            totalAmount: calculatedTotal,
            paymentMethod,
            discount: globalDiscount || 0,
            tax: globalTax || 0
        }, { transaction: t });

        let totalCostOfGoods = 0;

        // 3. Process Items: Create Detail, Deduct Stock, Log Movement
        for (let saleItem of saleItemsData) {
            await POS_SaleItem.create({
                ...saleItem,
                POSSaleId: sale.id
            }, { transaction: t });

            totalCostOfGoods += (saleItem.quantity * parseFloat(saleItem.costPrice));

            // Deduct Location Stock
            let stock = await StockBalance.findOne({ where: { ProductId: saleItem.ProductId, LocationId: locationId }, transaction: t });
            stock.quantity -= saleItem.quantity;
            await stock.save({ transaction: t });

            // Deduct Master Stock (Global)
            let master = await StockMaster.findOne({ where: { ProductId: saleItem.ProductId }, transaction: t });
            if (master) {
                master.totalQuantity -= saleItem.quantity;
                await master.save({ transaction: t });
            }

            // Audit Trail
            await StockMovement.create({
                ProductId: saleItem.ProductId,
                fromLocationId: locationId,
                quantity: saleItem.quantity,
                type: 'SALE',
                unitCost: saleItem.costPrice,
                unitPrice: saleItem.unitPrice,
                UserId: req.user ? req.user.id : null,
                remarks: `POS Sale #${sale.id}`
            }, { transaction: t });
        }

        // 4. Update Client Credit Balance (If Sale on Credit)
        if (req.body.clientId && paymentMethod === 'CREDIT') {
            const client = await Client.findByPk(req.body.clientId, { transaction: t });
            if (client) {
                client.creditBalance = parseFloat(client.creditBalance) + parseFloat(calculatedTotal);
                await client.save({ transaction: t });
            }
        }

        // 5. Accounting Journal Entries
        // Debit Cash/Receivable
        const debitAccount = paymentMethod === 'CREDIT' ? 'RECEIVABLE' : 'CASH';
        await Journal.create({
            description: `Sale #${sale.id}`,
            referenceId: `SALE-${sale.id}`,
            referenceType: 'SALE',
            debit: calculatedTotal,
            credit: 0,
            account: debitAccount
        }, { transaction: t });

        // Credit Revenue
        await Journal.create({
            description: `Sale Revenue #${sale.id}`,
            referenceId: `SALE-${sale.id}`,
            referenceType: 'SALE',
            debit: 0,
            credit: calculatedTotal,
            account: 'REVENUE'
        }, { transaction: t });

        // Debit COGS
        await Journal.create({
            description: `Cost of Goods #${sale.id}`,
            referenceId: `SALE-${sale.id}`,
            referenceType: 'SALE',
            debit: totalCostOfGoods,
            credit: 0,
            account: 'COGS'
        }, { transaction: t });

        // Credit Inventory
        await Journal.create({
            description: `Inventory Consumption #${sale.id}`,
            referenceId: `SALE-${sale.id}`,
            referenceType: 'SALE',
            debit: 0,
            credit: totalCostOfGoods,
            account: 'INVENTORY'
        }, { transaction: t });

        await t.commit();
        res.status(201).json({
            message: 'Sale completed successfully',
            saleId: sale.id,
            totalAmount: calculatedTotal,
            items: saleItemsData
        });

    } catch (error) {
        await t.rollback();
        res.status(400).json({ error: error.message });
    }
};

exports.returnSale = async (req, res) => {
    // Simplified Return: Reverses the stock and creates a negative movement
    const { saleId, items } = req.body;
    // items: [{ productId, quantity, reason }]

    const t = await sequelize.transaction();
    try {
        const originalSale = await POS_Sale.findByPk(saleId, { transaction: t });
        if (!originalSale) throw new Error('Sale not found');

        for (let item of items) {
            const originalItem = await POS_SaleItem.findOne({
                where: { POSSaleId: saleId, ProductId: item.productId },
                transaction: t
            });

            if (!originalItem) throw new Error(`Item ${item.productId} not found in this sale`);

            // Restock
            let stock = await StockBalance.findOne({ where: { ProductId: item.productId, LocationId: originalSale.LocationId }, transaction: t });
            if (stock) {
                stock.quantity += item.quantity;
                await stock.save({ transaction: t });
            }

            // Update Master Stock
            let master = await StockMaster.findOne({ where: { ProductId: item.productId }, transaction: t });
            if (master) {
                master.totalQuantity += item.quantity;
                await master.save({ transaction: t });
            }

            // Record Return Movement
            await StockMovement.create({
                ProductId: item.productId,
                toLocationId: originalSale.LocationId, // Returning TO the shop
                quantity: item.quantity,
                type: 'SALE_RETURN',
                unitCost: originalItem.costPrice,
                unitPrice: originalItem.unitPrice,
                UserId: req.user ? req.user.id : null,
                remarks: `Return from Sale #${saleId}: ${item.reason}`
            }, { transaction: t });
        }

        // Mark sale as containing returns (or partial) - For now just responding success
        await t.commit();
        res.json({ message: 'Return processed successfully' });

    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.getDailyReport = async (req, res) => {
    const { date, locationId } = req.query; // YYYY-MM-DD
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    try {
        const sales = await POS_Sale.findAll({
            where: {
                LocationId: locationId || { [Op.ne]: null },
                createdAt: { [Op.between]: [start, end] }
            },
            include: [POS_SaleItem]
        });

        const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
        const transactionCount = sales.length;

        res.json({
            date,
            locationId,
            totalRevenue,
            transactionCount,
            sales
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
