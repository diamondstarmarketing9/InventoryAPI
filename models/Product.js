const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
    itemCode: { type: DataTypes.STRING, unique: true, allowNull: false },
    shortCode: { type: DataTypes.STRING },
    nameAr: { type: DataTypes.STRING },
    nameEn: { type: DataTypes.STRING },
    unit: { type: DataTypes.STRING },
    brand: { type: DataTypes.STRING }, // Added brand
    purchasePrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }, // Weighted Average Cost
    sellingPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    minStockLevel: { type: DataTypes.INTEGER, defaultValue: 10 } // Alert Threshold
}, { timestamps: true });

module.exports = Product;
