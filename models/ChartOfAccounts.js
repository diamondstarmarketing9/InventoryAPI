const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChartOfAccounts = sequelize.define('ChartOfAccounts', {
    code: { type: DataTypes.STRING, unique: true, allowNull: false }, // e.g., '1010'
    name: { type: DataTypes.STRING, allowNull: false }, // e.g., 'Cash on Hand'
    type: {
        type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'),
        allowNull: false
    },
    description: { type: DataTypes.STRING },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    timestamps: true
});

module.exports = ChartOfAccounts;
