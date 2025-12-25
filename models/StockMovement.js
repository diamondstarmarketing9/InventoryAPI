const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./Product');
const Location = require('./Location');

const StockMovement = sequelize.define('StockMovement', {
    type: { type: DataTypes.STRING }, // PURCHASE, SALE, TRANSFER, ADJUSTMENT, PRODUCTION
    quantity: { type: DataTypes.DOUBLE },
    unitCost: { type: DataTypes.DECIMAL(10, 2) }, // Cost at time of movement (for Profit calc)
    unitPrice: { type: DataTypes.DECIMAL(10, 2) }, // Selling price (if SALE)
    remarks: { type: DataTypes.STRING }
}, { timestamps: true });

Product.hasMany(StockMovement);
StockMovement.belongsTo(Product);

Location.hasMany(StockMovement, { as: 'FromLocation', foreignKey: 'fromLocationId' });
StockMovement.belongsTo(Location, { as: 'FromLocation', foreignKey: 'fromLocationId' });

Location.hasMany(StockMovement, { as: 'ToLocation', foreignKey: 'toLocationId' });
StockMovement.belongsTo(Location, { as: 'ToLocation', foreignKey: 'toLocationId' });

const User = require('./User');
StockMovement.belongsTo(User); // Audit trail: who did it?
User.hasMany(StockMovement);

module.exports = StockMovement;
