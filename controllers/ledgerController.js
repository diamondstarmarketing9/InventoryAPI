const Journal = require('../models/Journal');
const ChartOfAccounts = require('../models/ChartOfAccounts');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

exports.getGeneralLedger = async (req, res) => {
    try {
        const { start, end, accountId } = req.query;
        const where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };
        if (accountId) where.ChartOfAccountId = accountId;

        const entries = await Journal.findAll({
            where,
            include: [ChartOfAccounts],
            order: [['date', 'ASC']]
        });

        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTrialBalance = async (req, res) => {
    try {
        // Aggregate by Account
        // This is a heavy query, usually done via SQL group by
        const results = await Journal.findAll({
            attributes: [
                'ChartOfAccountId',
                [sequelize.fn('SUM', sequelize.col('debit')), 'totalDebit'],
                [sequelize.fn('SUM', sequelize.col('credit')), 'totalCredit']
            ],
            include: [ChartOfAccounts],
            group: ['ChartOfAccountId', 'ChartOfAccounts.id']
        });

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
