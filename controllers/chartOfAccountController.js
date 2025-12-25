const ChartOfAccounts = require('../models/ChartOfAccounts');

exports.createAccount = async (req, res) => {
    try {
        const account = await ChartOfAccounts.create(req.body);
        res.status(201).json(account);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getAllAccounts = async (req, res) => {
    try {
        const accounts = await ChartOfAccounts.findAll();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAccountById = async (req, res) => {
    try {
        const account = await ChartOfAccounts.findByPk(req.params.id);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateAccount = async (req, res) => {
    try {
        const account = await ChartOfAccounts.findByPk(req.params.id);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        await account.update(req.body);
        res.json(account);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const account = await ChartOfAccounts.findByPk(req.params.id);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        await account.destroy();
        res.json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
