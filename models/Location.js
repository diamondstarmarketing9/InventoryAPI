const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Location = sequelize.define('Location', {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING } // SHOP or WAREHOUSE
}, { timestamps: false });

module.exports = Location;
