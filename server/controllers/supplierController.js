const { getDb } = require('../config/database');

function getMySuppliers(req, res) {
  const db = getDb();
  const suppliers = db.prepare(`
    SELECT u.id, u.nombre, u.email, u.empresa, u.telefono, cs.estado, cs.created_at
    FROM client_supplier cs
    JOIN users u ON u.id = cs.supplier_id
    WHERE cs.client_id = ?
    ORDER BY cs.created_at DESC
  `).all(req.user.id);
  res.json(suppliers);
}

function getMyClients(req, res) {
  const db = getDb();
  const clients = db.prepare(`
    SELECT u.id, u.nombre, u.email, u.empresa, u.telefono, cs.estado, cs.created_at
    FROM client_supplier cs
    JOIN users u ON u.id = cs.client_id
    WHERE cs.supplier_id = ?
    ORDER BY cs.created_at DESC
  `).all(req.user.id);
  res.json(clients);
}

function getAllSuppliers(req, res) {
  const db = getDb();
  const suppliers = db.prepare(`
    SELECT id, nombre, email, empresa, telefono FROM users WHERE rol = 'proveedor'
    ORDER BY nombre
  `).all();
  res.json(suppliers);
}

function linkSupplier(req, res) {
  const db = getDb();
  const { supplier_id } = req.body;

  if (!supplier_id) return res.status(400).json({ error: 'supplier_id es requerido' });

  const supplier = db.prepare("SELECT id FROM users WHERE id = ? AND rol = 'proveedor'").get(supplier_id);
  if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });

  try {
    db.prepare('INSERT INTO client_supplier (client_id, supplier_id) VALUES (?, ?)').run(req.user.id, supplier_id);
    res.status(201).json({ message: 'Proveedor vinculado correctamente' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Este proveedor ya esta vinculado' });
    }
    throw e;
  }
}

function unlinkSupplier(req, res) {
  const db = getDb();
  const { id } = req.params;
  db.prepare('DELETE FROM client_supplier WHERE client_id = ? AND supplier_id = ?').run(req.user.id, id);
  res.json({ message: 'Proveedor desvinculado' });
}

module.exports = { getMySuppliers, getMyClients, getAllSuppliers, linkSupplier, unlinkSupplier };
