const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./Product');

// This acts as a central aggregation table (often called a 'Materialized View' concept or Master Stock table)
// It stores the TOTAL stock of a product across ALL locations for quick lookup.
const StockMaster = sequelize.define('StockMaster', {
    totalQuantity: { type: DataTypes.DOUBLE, defaultValue: 0 },
    averageCost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }, // Centralized WAC
    lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: true });

Product.hasOne(StockMaster); // One master record per product
StockMaster.belongsTo(Product);

module.exports = StockMaster;
