const Location = require('../models/Location');

exports.createLocation = async (req, res) => {
    try {
        const location = await Location.create(req.body);
        res.status(201).json(location);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getLocations = async (req, res) => {
    try {
        const locations = await Location.findAll();
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateLocation = async (req, res) => {
    const { id } = req.params;
    try {
        const location = await Location.findByPk(id);
        if (!location) return res.status(404).json({ error: 'Not found' });
        await location.update(req.body);
        res.json(location);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteLocation = async (req, res) => {
    const { id } = req.params;
    try {
        const location = await Location.findByPk(id);
        if (!location) return res.status(404).json({ error: 'Not found' });
        await location.destroy();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
