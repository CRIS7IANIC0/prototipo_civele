require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
const allowedOrigins = ['http://localhost:5173', process.env.FRONTEND_URL];
app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/suppliers', require('./routes/suppliers'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Iniciar monitor de stock
const { startStockMonitor } = require('./services/stockMonitor');
startStockMonitor();

app.listen(PORT, () => {
  console.log(`Servidor CIVELE corriendo en http://localhost:${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
});

module.exports = app;
