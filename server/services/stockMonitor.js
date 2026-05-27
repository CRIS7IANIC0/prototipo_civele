const cron = require('node-cron');
const { getDb } = require('../config/database');
const { analyzeStock, generateAlertMessage } = require('./aiStockAnalyzer');
const { sendStockAlertEmail } = require('./emailService');

/**
 * Monitor periodico de stock.
 * Ejecuta el analisis de IA cada hora para todos los clientes.
 * Genera notificaciones y envia correos al proveedor cuando detecta stock bajo.
 */
async function runStockCheck() {
  const db = getDb();
  console.log(`[StockMonitor] Ejecutando analisis - ${new Date().toISOString()}`);

  try {
    // Obtener todos los clientes activos
    const clients = db.prepare("SELECT id, nombre, empresa FROM users WHERE rol = 'cliente'").all();

    for (const client of clients) {
      const alerts = analyzeStock(client.id);

      for (const alert of alerts) {
        if (!alert.supplier_id) continue;

        // Verificar si ya existe una notificacion no leida para este producto en las ultimas 24h
        const recentNotif = db.prepare(`
          SELECT id FROM notifications
          WHERE product_id = ? AND to_user_id = ? AND leida = 0
            AND created_at >= datetime('now', '-24 hours')
        `).get(alert.product_id, alert.supplier_id);

        if (recentNotif) continue; // Ya se notifico recientemente

        // Crear notificacion en BD
        const mensaje = generateAlertMessage(alert);
        db.prepare(`
          INSERT INTO notifications (tipo, mensaje, product_id, from_user_id, to_user_id, cantidad_sugerida, urgencia)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          'stock_bajo',
          mensaje,
          alert.product_id,
          client.id,
          alert.supplier_id,
          alert.cantidad_sugerida,
          alert.urgencia
        );

        // Enviar correo al proveedor
        if (alert.supplier_email) {
          const emailResult = await sendStockAlertEmail(
            alert.supplier_email,
            [alert],
            client.nombre,
            client.empresa
          );

          if (emailResult.success) {
            // Marcar email como enviado
            db.prepare(`
              UPDATE notifications SET email_enviado = 1
              WHERE product_id = ? AND to_user_id = ? AND email_enviado = 0
              ORDER BY created_at DESC LIMIT 1
            `).run(alert.product_id, alert.supplier_id);
          }
        }
      }
    }

    console.log(`[StockMonitor] Analisis completado. Alertas procesadas correctamente.`);
  } catch (error) {
    console.error('[StockMonitor] Error en analisis:', error);
  }
}

function startStockMonitor() {
  // Ejecutar cada hora
  cron.schedule('0 * * * *', runStockCheck);
  console.log('[StockMonitor] Monitor iniciado. Se ejecuta cada hora.');

  // Ejecutar inmediatamente al iniciar
  setTimeout(runStockCheck, 3000);
}

module.exports = { startStockMonitor, runStockCheck };
