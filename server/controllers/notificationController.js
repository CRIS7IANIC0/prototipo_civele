const { getDb } = require('../config/database');

function getNotifications(req, res) {
  const db = getDb();
  const { leida } = req.query;

  let query = `
    SELECT n.*, p.nombre as product_nombre, p.unidad, u.nombre as from_nombre, u.empresa as from_empresa
    FROM notifications n
    LEFT JOIN products p ON p.id = n.product_id
    LEFT JOIN users u ON u.id = n.from_user_id
    WHERE n.to_user_id = ?
  `;
  const params = [req.user.id];

  if (leida !== undefined) {
    query += ` AND n.leida = ?`;
    params.push(leida === 'true' ? 1 : 0);
  }

  query += ` ORDER BY n.created_at DESC LIMIT 100`;

  const notifications = db.prepare(query).all(...params);
  res.json(notifications);
}

function markAsRead(req, res) {
  const db = getDb();
  const { id } = req.params;

  const notif = db.prepare('SELECT id FROM notifications WHERE id = ? AND to_user_id = ?').get(id, req.user.id);
  if (!notif) return res.status(404).json({ error: 'Notificacion no encontrada' });

  db.prepare('UPDATE notifications SET leida = 1 WHERE id = ?').run(id);
  res.json({ message: 'Notificacion marcada como leida' });
}

function markAllAsRead(req, res) {
  const db = getDb();
  db.prepare('UPDATE notifications SET leida = 1 WHERE to_user_id = ?').run(req.user.id);
  res.json({ message: 'Todas las notificaciones marcadas como leidas' });
}

function getUnreadCount(req, res) {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE to_user_id = ? AND leida = 0').get(req.user.id);
  res.json({ count: result.count });
}

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
