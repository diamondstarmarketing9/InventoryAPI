const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socket = require('../socket');
require('dotenv').config();

exports.register = async (req, res) => {
    const { username, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const user = await User.create({ username, password: hashed, role });
        res.json({ message: 'User created', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '8h' });

        try {
            const io = socket.getIO();
            io.emit('user_activity', { type: 'LOGIN', userId: user.id, username: user.username, timestamp: new Date() });
        } catch (e) { console.error('Socket emit failed', e); }

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
