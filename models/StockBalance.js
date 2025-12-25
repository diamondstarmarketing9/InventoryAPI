const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./Product');
const Location = require('./Location');

const StockBalance = sequelize.define('StockBalance', {
    quantity: { type: DataTypes.DOUBLE, defaultValue: 0 }
}, { timestamps: true });

Product.hasMany(StockBalance);
StockBalance.belongsTo(Product);

Location.hasMany(StockBalance);
StockBalance.belongsTo(Location);

module.exports = StockBalance;
