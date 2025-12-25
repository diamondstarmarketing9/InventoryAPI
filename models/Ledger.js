const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const ChartOfAccounts = require('./ChartOfAccounts');

const Ledger = sequelize.define('Ledger', {
    fiscalYear: { type: DataTypes.INTEGER, allowNull: false }, // e.g. 2025
    fiscalMonth: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
    openingBalance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    totalDebit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    totalCredit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    closingBalance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
    timestamps: true
});

ChartOfAccounts.hasMany(Ledger);
Ledger.belongsTo(ChartOfAccounts);

module.exports = Ledger;
