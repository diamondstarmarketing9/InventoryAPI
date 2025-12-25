const PriceHistory = require('../models/PriceHistory');
const Product = require('../models/Product');

exports.getPriceHistory = async (req, res) => {
    const { productId } = req.query;
    try {
        const history = await PriceHistory.findAll({
            where: { ProductId: productId },
            order: [['createdAt', 'DESC']],
            include: [Product]
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
