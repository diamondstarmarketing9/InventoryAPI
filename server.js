const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/db');

// Models (important for associations)
require('./models/Product');
require('./models/Location');
require('./models/StockBalance');
require('./models/StockMovement');
require('./models/User');
require('./models/Supplier');
require('./models/PriceHistory');
require('./models/StockMaster');
require('./models/POS_Sale');
require('./models/POS_SaleItem');
require('./models/Client');
require('./models/Journal');

const productRoutes = require('./routes/product');
const stockRoutes = require('./routes/stock');
const locationRoutes = require('./routes/location');
const auditRoutes = require('./routes/audit');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/report');
const priceRoutes = require('./routes/price');
const posRoutes = require('./routes/pos');
const clientRoutes = require('./routes/client');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/clients', clientRoutes);

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
