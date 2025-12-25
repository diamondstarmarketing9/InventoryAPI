const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const POS_Sale = require('./POS_Sale');
const Product = require('./Product');

const POS_SaleItem = sequelize.define('POS_SaleItem', {
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // Selling Price at time of sale
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // (Qty * Price) - ItemDiscount + Tax
    costPrice: { type: DataTypes.DECIMAL(10, 2) }, // COGS at time of sale
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, { timestamps: true });

POS_Sale.hasMany(POS_SaleItem);
POS_SaleItem.belongsTo(POS_Sale);
POS_SaleItem.belongsTo(Product);

module.exports = POS_SaleItem;
