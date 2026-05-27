const { getDb } = require('../config/database');
const { analyzeStock, generateAlertMessage } = require('../services/aiStockAnalyzer');
const { sendStockAlertEmail } = require('../services/emailService');

function getInventory(req, res) {
  const db = getDb();
  const { search, categoria } = req.query;

  let query = `
    SELECT p.*, u.nombre as supplier_nombre, u.email as supplier_email, u.empresa as supplier_empresa
    FROM products p
    LEFT JOIN users u ON u.id = p.supplier_id
    WHERE p.client_id = ?
  `;
  const params = [req.user.id];

  if (search) {
    query += ` AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoria) {
    query += ` AND p.categoria = ?`;
    params.push(categoria);
  }

  query += ` ORDER BY p.updated_at DESC`;

  const products = db.prepare(query).all(...params);
  res.json(products);
}

function createProduct(req, res) {
  const db = getDb();
  const { nombre, descripcion, categoria, unidad, precio_unitario, stock_actual, stock_minimo, stock_maximo, supplier_id } = req.body;

  if (!nombre || stock_actual === undefined || stock_minimo === undefined || stock_maximo === undefined) {
    return res.status(400).json({ error: 'Campos requeridos: nombre, stock_actual, stock_minimo, stock_maximo' });
  }

  const result = db.prepare(`
    INSERT INTO products (nombre, descripcion, categoria, unidad, precio_unitario, stock_actual, stock_minimo, stock_maximo, client_id, supplier_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nombre,
    descripcion || null,
    categoria || 'General',
    unidad || 'unidades',
    precio_unitario || 0,
    stock_actual,
    stock_minimo,
    stock_maximo,
    req.user.id,
    supplier_id || null
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
}

function updateProduct(req, res) {
  const db = getDb();
  const { id } = req.params;

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND client_id = ?').get(id, req.user.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const { nombre, descripcion, categoria, unidad, precio_unitario, stock_minimo, stock_maximo, supplier_id } = req.body;

  db.prepare(`
    UPDATE products SET
      nombre = COALESCE(?, nombre),
      descripcion = COALESCE(?, descripcion),
      categoria = COALESCE(?, categoria),
      unidad = COALESCE(?, unidad),
      precio_unitario = COALESCE(?, precio_unitario),
      stock_minimo = COALESCE(?, stock_minimo),
      stock_maximo = COALESCE(?, stock_maximo),
      supplier_id = COALESCE(?, supplier_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nombre, descripcion, categoria, unidad, precio_unitario, stock_minimo, stock_maximo, supplier_id, id);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(updated);
}

function deleteProduct(req, res) {
  const db = getDb();
  const { id } = req.params;

  const product = db.prepare('SELECT id FROM products WHERE id = ? AND client_id = ?').get(id, req.user.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ message: 'Producto eliminado correctamente' });
}

function addMovement(req, res) {
  const db = getDb();
  const { id } = req.params;
  const { tipo, cantidad, motivo } = req.body;

  if (!tipo || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Tipo y cantidad validos son requeridos' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND client_id = ?').get(id, req.user.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  if (tipo === 'salida' && product.stock_actual < cantidad) {
    return res.status(400).json({ error: 'Stock insuficiente para registrar salida' });
  }

  db.prepare(`
    INSERT INTO stock_movements (product_id, tipo, cantidad, motivo, user_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, tipo, cantidad, motivo || null, req.user.id);

  const newStock = tipo === 'entrada'
    ? product.stock_actual + parseInt(cantidad)
    : product.stock_actual - parseInt(cantidad);

  db.prepare('UPDATE products SET stock_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ product: updated, movement: { tipo, cantidad, motivo } });
}

function getMovements(req, res) {
  const db = getDb();
  const { id } = req.params;
  const product = db.prepare('SELECT id FROM products WHERE id = ? AND client_id = ?').get(id, req.user.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const movements = db.prepare(`
    SELECT sm.*, u.nombre as user_nombre
    FROM stock_movements sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.product_id = ?
    ORDER BY sm.created_at DESC
    LIMIT 50
  `).all(id);

  res.json(movements);
}

async function analyzeInventory(req, res) {
  try {
    const db = getDb();
    const alerts = analyzeStock(req.user.id);

    // Para cada alerta, generar notificacion si no existe reciente
    const client = db.prepare('SELECT nombre, empresa FROM users WHERE id = ?').get(req.user.id);

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const alert of alerts) {
      if (!alert.supplier_id) continue;

      const recentNotif = db.prepare(`
        SELECT id FROM notifications
        WHERE product_id = ? AND to_user_id = ? AND leida = 0
          AND created_at >= datetime('now', '-1 hours')
      `).get(alert.product_id, alert.supplier_id);

      if (!recentNotif) {
        const mensaje = generateAlertMessage(alert);
        db.prepare(`
          INSERT INTO notifications (tipo, mensaje, product_id, from_user_id, to_user_id, cantidad_sugerida, urgencia)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('stock_bajo', mensaje, alert.product_id, req.user.id, alert.supplier_id, alert.cantidad_sugerida, alert.urgencia);
        notificationsCreated++;

        if (alert.supplier_email) {
          const emailResult = await sendStockAlertEmail(
            alert.supplier_email,
            [alert],
            client.nombre,
            client.empresa
          );
          if (emailResult.success) emailsSent++;
        }
      }
    }

    res.json({
      alerts,
      summary: {
        total: alerts.length,
        critico: alerts.filter(a => a.urgencia === 'critico').length,
        urgente: alerts.filter(a => a.urgencia === 'urgente').length,
        alerta: alerts.filter(a => a.urgencia === 'alerta').length,
        notificationsCreated,
        emailsSent,
      },
    });
  } catch (error) {
    console.error('Error en analisis:', error);
    res.status(500).json({ error: 'Error al analizar inventario' });
  }
}

function getAlerts(req, res) {
  const alerts = analyzeStock(req.user.id);
  res.json(alerts);
}

function getCategories(req, res) {
  const db = getDb();
  const categories = db.prepare(`
    SELECT DISTINCT categoria FROM products WHERE client_id = ? ORDER BY categoria
  `).all(req.user.id);
  res.json(categories.map(c => c.categoria));
}

module.exports = { getInventory, createProduct, updateProduct, deleteProduct, addMovement, getMovements, analyzeInventory, getAlerts, getCategories };
