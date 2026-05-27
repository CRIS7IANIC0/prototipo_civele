const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
  getInventory, createProduct, updateProduct, deleteProduct,
  addMovement, getMovements, analyzeInventory, getAlerts, getCategories
} = require('../controllers/inventoryController');

router.use(authMiddleware);
router.use(requireRole('cliente'));

router.get('/', getInventory);
router.post('/', createProduct);
router.get('/meta/categories', getCategories);
router.get('/meta/alerts', getAlerts);
router.post('/meta/analyze', analyzeInventory);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/movement', addMovement);
router.get('/:id/movements', getMovements);

module.exports = router;
