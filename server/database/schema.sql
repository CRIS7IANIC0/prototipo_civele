-- CIVELE Platform Database Schema

-- Usuarios (clientes y proveedores)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('cliente', 'proveedor')),
  empresa TEXT,
  telefono TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relacion muchos a muchos entre clientes y proveedores
CREATE TABLE IF NOT EXISTS client_supplier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, supplier_id)
);

-- Productos del inventario de cada cliente
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'General',
  unidad TEXT DEFAULT 'unidades',
  precio_unitario REAL DEFAULT 0,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  stock_maximo INTEGER NOT NULL DEFAULT 100,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Movimientos de stock (entradas y salidas)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL CHECK(cantidad > 0),
  motivo TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notificaciones de stock bajo enviadas al proveedor
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK(tipo IN ('stock_bajo', 'reorden', 'confirmacion', 'general')),
  mensaje TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leida INTEGER DEFAULT 0,
  email_enviado INTEGER DEFAULT 0,
  cantidad_sugerida INTEGER DEFAULT 0,
  urgencia TEXT DEFAULT 'normal' CHECK(urgencia IN ('critico', 'urgente', 'alerta', 'normal')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_products_client ON products(client_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_to_user ON notifications(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida ON notifications(leida);
