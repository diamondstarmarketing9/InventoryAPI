const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Journal = sequelize.define('Journal', {
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    description: { type: DataTypes.STRING },
    referenceId: { type: DataTypes.STRING }, // e.g., 'SALE-101'
    referenceType: { type: DataTypes.STRING }, // 'SALE', 'PURCHASE', 'ADJUSTMENT'
    debit: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    credit: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    // account: { type: DataTypes.STRING } -- Deprecated in favor of relation, but keeping for simple text fallback if needed, or removing
    // We will use ChartOfAccountId
}, { timestamps: true });

const ChartOfAccounts = require('./ChartOfAccounts');
ChartOfAccounts.hasMany(Journal);
Journal.belongsTo(ChartOfAccounts);

module.exports = Journal;
