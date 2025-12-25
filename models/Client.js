const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Client = sequelize.define('Client', {
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, validate: { isEmail: true } },
    address: { type: DataTypes.STRING },
    creditBalance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    loyaltyPoints: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: true });

module.exports = Client;
