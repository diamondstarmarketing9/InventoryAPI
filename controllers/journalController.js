const Journal = require('../models/Journal');
const sequelize = require('../config/db');
const socket = require('../socket');

// List with filters
exports.getAllEntries = async (req, res) => {
    try {
        const { start, end, accountId, referenceType } = req.query;
        const where = {};
        if (start && end) where.date = { [sequelize.Op.between]: [start, end] };
        if (accountId) where.ChartOfAccountId = accountId;
        if (referenceType) where.referenceType = referenceType;

        const entries = await Journal.findAll({ where });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEntryById = async (req, res) => {
    try {
        const entry = await Journal.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create Manual Journal Entry (Batch preferred to ensure balance)
// Expects body: { description, date, entries: [ { accountId, debit, credit } ] }
exports.createManualEntry = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { description, date, entries } = req.body; // entries is array

        // Validate Balance
        let totalDebit = 0;
        let totalCredit = 0;
        entries.forEach(e => {
            totalDebit += parseFloat(e.debit || 0);
            totalCredit += parseFloat(e.credit || 0);
        });

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Journal Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
        }

        const referenceId = `MJE-${Date.now()}`;
        const createdEntries = [];

        for (let e of entries) {
            const entry = await Journal.create({
                date: date || new Date(),
                description,
                referenceId,
                referenceType: 'MANUAL',
                ChartOfAccountId: e.accountId,
                debit: e.debit || 0,
                credit: e.credit || 0
            }, { transaction: t });
            createdEntries.push(entry);
        }

        await t.commit();
        try {
            const io = socket.getIO();
            // Broadcast to 'admin' room or similar? Or just global?
            // Since ledgers are usually global or per store, let's assume global update for now or check if we can filter.
            // But manual entries might not have a location.
            io.emit('ledger_updated', { referenceId, timestamp: new Date() });
        } catch (e) { console.error('Socket emit failed', e); }
        res.status(201).json({ message: 'Journal Entry Created', referenceId, entries: createdEntries });
    } catch (error) {
        await t.rollback();
        res.status(400).json({ error: error.message });
    }
};

exports.updateEntry = async (req, res) => {
    try {
        const entry = await Journal.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        // CAUTION: Editing a single journal entry can break balance.
        // Ideally restricted or requires re-balancing logic.
        await entry.update(req.body);
        res.json(entry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteEntry = async (req, res) => {
    try {
        const entry = await Journal.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        // CAUTION: Deleting one breaks balance.
        await entry.destroy();
        res.json({ message: 'Entry deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
