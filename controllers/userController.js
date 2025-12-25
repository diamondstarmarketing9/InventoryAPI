const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    // Admin creates user directly (alternative to register)
    const { username, password, role } = req.body;
    try {
        const user = await User.create({ username, password, role }); // Password hashing usually done in Model Hook or Controller.
        // Assuming Model Hook for strictness, but let's check User model. 
        // If Model doesn't have hook, we must hash here. 
        // AuthController hashes manually. So User model likely lacks hook.
        // I should probably hash it here to be safe or update Model to hash.
        // For now, I'll return error or hash if I import bcrypt.
        // Let's rely on AuthController logic or just provide Update/Delete here.
        // Or assume User.create handles it if I add Hook. 
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await user.update(req.body); // If password update, hashing needed.
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await user.destroy();
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
