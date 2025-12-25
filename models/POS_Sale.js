const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Location = require('./Location');

const POS_Sale = sequelize.define('POS_Sale', {
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    paymentMethod: { type: DataTypes.STRING }, // CASH, CARD, SPLIT
    status: { type: DataTypes.STRING, defaultValue: 'COMPLETED' }, // COMPLETED, RETURNED
}, { timestamps: true });

const Client = require('./Client');

POS_Sale.belongsTo(User);
POS_Sale.belongsTo(Location);
POS_Sale.belongsTo(Client);

module.exports = POS_Sale;
