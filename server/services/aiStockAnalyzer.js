const { getDb } = require('../config/database');

/**
 * Motor de Analisis Inteligente de Stock
 * 
 * Algoritmo:
 * 1. Calcula consumo diario promedio de los ultimos 30 dias
 * 2. Determina dias restantes de stock
 * 3. Clasifica nivel de urgencia
 * 4. Genera cantidad de reposicion sugerida
 * 5. Retorna lista de alertas con detalles
 */

const DIAS_ANALISIS = 30;
const DIAS_MARGEN_SEGURIDAD = 7; // dias de margen para reorden

function analyzeStock(clientId) {
  const db = getDb();

  // Obtener todos los productos del cliente
  const products = db.prepare(`
    SELECT p.*, u.nombre as supplier_nombre, u.email as supplier_email
    FROM products p
    LEFT JOIN users u ON u.id = p.supplier_id
    WHERE p.client_id = ?
  `).all(clientId);

  const alerts = [];

  for (const product of products) {
    const analysis = analyzeProduct(product, db);
    if (analysis.necesita_alerta) {
      alerts.push(analysis);
    }
  }

  // Ordenar por urgencia
  const urgencyOrder = { critico: 0, urgente: 1, alerta: 2, normal: 3 };
  alerts.sort((a, b) => urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia]);

  return alerts;
}

function analyzeProduct(product, db) {
  // Calcular total de salidas en los ultimos 30 dias
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DIAS_ANALISIS);
  const cutoffISO = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

  const movimientos = db.prepare(`
    SELECT tipo, SUM(cantidad) as total
    FROM stock_movements
    WHERE product_id = ? AND created_at >= ?
    GROUP BY tipo
  `).all(product.id, cutoffISO);

  const totalSalidas = movimientos.find(m => m.tipo === 'salida')?.total || 0;
  const totalEntradas = movimientos.find(m => m.tipo === 'entrada')?.total || 0;

  // Consumo diario promedio
  const consumoDiario = totalSalidas / DIAS_ANALISIS;

  // Dias restantes de stock
  const diasRestantes = consumoDiario > 0
    ? Math.floor(product.stock_actual / consumoDiario)
    : (product.stock_actual > 0 ? 999 : 0);

  // Punto de reorden: stock para sobrevivir el margen de seguridad
  const puntoReorden = Math.ceil(consumoDiario * DIAS_MARGEN_SEGURIDAD);

  // Clasificar urgencia
  let urgencia = 'normal';
  let necesita_alerta = false;

  if (product.stock_actual === 0) {
    urgencia = 'critico';
    necesita_alerta = true;
  } else if (product.stock_actual <= product.stock_minimo) {
    urgencia = 'urgente';
    necesita_alerta = true;
  } else if (product.stock_actual <= puntoReorden && puntoReorden > product.stock_minimo) {
    urgencia = 'alerta';
    necesita_alerta = true;
  }

  // Cantidad sugerida de reposicion (para llegar al stock maximo)
  const cantidad_sugerida = Math.max(0, product.stock_maximo - product.stock_actual);

  return {
    product_id: product.id,
    nombre: product.nombre,
    categoria: product.categoria,
    unidad: product.unidad,
    stock_actual: product.stock_actual,
    stock_minimo: product.stock_minimo,
    stock_maximo: product.stock_maximo,
    consumo_diario: Math.round(consumoDiario * 10) / 10,
    dias_restantes: diasRestantes,
    punto_reorden: puntoReorden,
    cantidad_sugerida,
    urgencia,
    necesita_alerta,
    supplier_id: product.supplier_id,
    supplier_nombre: product.supplier_nombre,
    supplier_email: product.supplier_email,
    porcentaje_stock: Math.round((product.stock_actual / product.stock_maximo) * 100),
  };
}

function generateAlertMessage(analysis) {
  const urgencyText = {
    critico: 'CRITICO - Sin Stock',
    urgente: 'URGENTE - Stock Minimo',
    alerta: 'ALERTA - Stock Bajo',
    normal: 'Normal',
  };

  return `[${urgencyText[analysis.urgencia]}] ${analysis.nombre}: ` +
    `Stock actual ${analysis.stock_actual} ${analysis.unidad}. ` +
    `Se requieren ${analysis.cantidad_sugerida} ${analysis.unidad} para reposicion. ` +
    `Consumo promedio: ${analysis.consumo_diario} ${analysis.unidad}/dia. ` +
    `Dias restantes estimados: ${analysis.dias_restantes}.`;
}

module.exports = { analyzeStock, analyzeProduct, generateAlertMessage };
