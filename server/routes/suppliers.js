const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { getMySuppliers, getMyClients, getAllSuppliers, linkSupplier, unlinkSupplier } = require('../controllers/supplierController');

router.use(authMiddleware);

router.get('/all', getAllSuppliers);
router.get('/my-suppliers', requireRole('cliente'), getMySuppliers);
router.get('/my-clients', requireRole('proveedor'), getMyClients);
router.post('/link', requireRole('cliente'), linkSupplier);
router.delete('/:id/unlink', requireRole('cliente'), unlinkSupplier);

module.exports = router;
