const StockBalance = require('../models/StockBalance');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Location = require('../models/Location');
const { Op } = require('sequelize');

exports.lowStock = async (req, res) => {
    try {
        // Find stocks where quantity is lower than the product's minStockLevel
        // logic: join Product, where StockBalance.quantity <= Product.minStockLevel
        // Sequelize makes querying across associated columns a bit tricky, often easiest to do query on Product

        const productsStart = await Product.findAll();
        // This is not efficient for millions of rows, but fine for typical SMB inventory
        // A raw query is better for scale: SELECT * FROM StockBalances s JOIN Products p ON s.ProductId = p.id WHERE s.quantity <= p.minStockLevel

        const stocks = await StockBalance.findAll({
            include: [{
                model: Product,
                required: true
            }, {
                model: Location
            }]
        });

        const lowStockItems = stocks.filter(stock => stock.quantity <= stock.Product.minStockLevel);

        res.json(lowStockItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.movementHistory = async (req, res) => {
    const { productId } = req.query;
    try {
        const movements = await StockMovement.findAll({
            where: { ProductId: productId || { [Op.ne]: null } },
            include: [Product, { model: Location, as: 'FromLocation' }, { model: Location, as: 'ToLocation' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(movements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.profitReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const sales = await StockMovement.findAll({
            where: {
                type: 'SALE',
                createdAt: {
                    [Op.between]: [startDate || '2000-01-01', endDate || new Date()]
                }
            },
            include: [Product]
        });

        const report = sales.map(sale => {
            const revenue = sale.quantity * sale.unitPrice;
            const cogs = sale.quantity * sale.unitCost;
            return {
                date: sale.createdAt,
                product: sale.Product.nameEn,
                quantity: sale.quantity,
                revenue,
                cogs,
                grossProfit: revenue - cogs
            };
        });

        const totalProfit = report.reduce((sum, item) => sum + item.grossProfit, 0);

        res.json({ totalProfit, details: report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.inventoryValuation = async (req, res) => {
    try {
        const stocks = await StockBalance.findAll({
            include: [Product]
        });

        let totalValue = 0;
        const valuation = stocks.map(stock => {
            const stockValue = stock.quantity * parseFloat(stock.Product.purchasePrice);
            totalValue += stockValue;
            return {
                product: stock.Product.nameEn,
                quantity: stock.quantity,
                avgCost: stock.Product.purchasePrice,
                value: stockValue
            };
        });

        res.json({ totalPortfolioValue: totalValue, breakdown: valuation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
