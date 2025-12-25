const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./Product');

const PriceHistory = sequelize.define('PriceHistory', {
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // The new price (Purchase or Selling)
    type: { type: DataTypes.STRING }, // 'PURCHASE' or 'SELLING'
    effectiveDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    source: { type: DataTypes.STRING } // 'PURCHASE_ORDER', 'MANUAL_UPDATE', etc.
}, { timestamps: true });

Product.hasMany(PriceHistory);
PriceHistory.belongsTo(Product);

module.exports = PriceHistory;
