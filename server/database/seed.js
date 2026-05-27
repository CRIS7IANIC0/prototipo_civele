const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');

async function seed() {
  const db = getDb();

  // Verificar si ya hay datos
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('La base de datos ya tiene datos. Saltando seed...');
    return;
  }

  console.log('Insertando datos de prueba...');

  // Crear usuarios de prueba
  const passwordHash = await bcrypt.hash('123456', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (nombre, email, password_hash, rol, empresa, telefono)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Clientes
  const cliente1 = insertUser.run('Maria Rodriguez', 'cliente1@civele.com', passwordHash, 'cliente', 'Distribuidora Rodriguez', '3001234567');
  const cliente2 = insertUser.run('Carlos Mendez', 'cliente2@civele.com', passwordHash, 'cliente', 'Comercializadora Mendez', '3009876543');

  // Proveedores
  const prov1 = insertUser.run('Juan Supplier', 'proveedor1@civele.com', passwordHash, 'proveedor', 'Suministros JR', '3101112233');
  const prov2 = insertUser.run('Ana Distribuciones', 'proveedor2@civele.com', passwordHash, 'proveedor', 'Distribuciones Ana', '3204445566');

  // Vincular clientes con proveedores
  const insertRelation = db.prepare('INSERT INTO client_supplier (client_id, supplier_id) VALUES (?, ?)');
  insertRelation.run(cliente1.lastInsertRowid, prov1.lastInsertRowid);
  insertRelation.run(cliente1.lastInsertRowid, prov2.lastInsertRowid);
  insertRelation.run(cliente2.lastInsertRowid, prov1.lastInsertRowid);

  // Productos del cliente 1
  const insertProduct = db.prepare(`
    INSERT INTO products (nombre, descripcion, categoria, unidad, precio_unitario, stock_actual, stock_minimo, stock_maximo, client_id, supplier_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const c1 = cliente1.lastInsertRowid;
  const c2 = cliente2.lastInsertRowid;
  const p1 = prov1.lastInsertRowid;
  const p2 = prov2.lastInsertRowid;

  // Productos cliente 1 - varios estados de stock
  const prod1 = insertProduct.run('Tornillos M8 x 50mm', 'Tornillos de acero galvanizado', 'Ferreteria', 'unidades', 150, 3, 20, 500, c1, p1);
  const prod2 = insertProduct.run('Pintura Blanca 4L', 'Pintura vinilica blanca', 'Pinturas', 'galones', 45000, 8, 10, 100, c1, p1);
  const prod3 = insertProduct.run('Cable Electrico 2.5mm', 'Cable electrico unipolar', 'Electrico', 'metros', 1200, 50, 100, 1000, c1, p2);
  const prod4 = insertProduct.run('Cemento Portland 50kg', 'Saco de cemento gris', 'Construccion', 'sacos', 28000, 5, 15, 200, c1, p1);
  const prod5 = insertProduct.run('Varilla Corrugada 3/8', 'Varilla de acero corrugado', 'Construccion', 'unidades', 18000, 12, 10, 150, c1, p2);
  const prod6 = insertProduct.run('Tubo PVC 4 pulgadas', 'Tubo PVC presion', 'Plomeria', 'unidades', 25000, 0, 5, 50, c1, p1);
  const prod7 = insertProduct.run('Grifa de Paso 1/2', 'Grifo metalico media pulgada', 'Plomeria', 'unidades', 35000, 25, 5, 60, c1, p2);
  const prod8 = insertProduct.run('Bombillo LED 9W', 'Bombillo LED luz blanca', 'Electrico', 'unidades', 8500, 4, 20, 200, c1, p2);

  // Productos cliente 2
  const prod9 = insertProduct.run('Aceite Motor 20W-50', 'Aceite mineral para motor', 'Automotriz', 'litros', 22000, 2, 10, 100, c2, p1);
  const prod10 = insertProduct.run('Filtro de Aire', 'Filtro de aire universal', 'Automotriz', 'unidades', 45000, 18, 5, 50, c2, p1);
  const prod11 = insertProduct.run('Liquido de Frenos DOT4', 'Liquido de frenos sintetico', 'Automotriz', 'frascos', 18000, 3, 8, 80, c2, p1);
  const prod12 = insertProduct.run('Pastillas de Freno Delanteras', 'Kit pastillas ceramicas', 'Automotriz', 'kits', 95000, 7, 5, 30, c2, p1);

  // Movimientos de stock (ultimos 30 dias)
  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (product_id, tipo, cantidad, motivo, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ? || ' days'))
  `);

  // Movimientos para simular consumo
  const movements = [
    [prod1.lastInsertRowid, 'entrada', 50, 'Compra inicial', c1, '-25'],
    [prod1.lastInsertRowid, 'salida', 20, 'Uso en obra', c1, '-20'],
    [prod1.lastInsertRowid, 'salida', 15, 'Uso en obra', c1, '-15'],
    [prod1.lastInsertRowid, 'salida', 12, 'Uso en mantenimiento', c1, '-10'],
    [prod2.lastInsertRowid, 'entrada', 30, 'Compra inicial', c1, '-28'],
    [prod2.lastInsertRowid, 'salida', 10, 'Pintura fachada', c1, '-20'],
    [prod2.lastInsertRowid, 'salida', 8, 'Pintura interior', c1, '-12'],
    [prod2.lastInsertRowid, 'salida', 4, 'Reparacion', c1, '-5'],
    [prod3.lastInsertRowid, 'entrada', 500, 'Compra inicial', c1, '-30'],
    [prod3.lastInsertRowid, 'salida', 200, 'Instalacion', c1, '-22'],
    [prod3.lastInsertRowid, 'salida', 150, 'Proyecto nuevo', c1, '-14'],
    [prod3.lastInsertRowid, 'salida', 100, 'Reparacion electrica', c1, '-7'],
    [prod4.lastInsertRowid, 'entrada', 80, 'Compra inicial', c1, '-29'],
    [prod4.lastInsertRowid, 'salida', 30, 'Construccion', c1, '-21'],
    [prod4.lastInsertRowid, 'salida', 25, 'Construccion', c1, '-14'],
    [prod4.lastInsertRowid, 'salida', 20, 'Obra mayor', c1, '-7'],
    [prod6.lastInsertRowid, 'entrada', 20, 'Compra inicial', c1, '-30'],
    [prod6.lastInsertRowid, 'salida', 20, 'Instalacion plomeria', c1, '-15'],
    [prod8.lastInsertRowid, 'entrada', 100, 'Compra inicial', c1, '-28'],
    [prod8.lastInsertRowid, 'salida', 50, 'Instalacion edificio', c1, '-20'],
    [prod8.lastInsertRowid, 'salida', 30, 'Mantenimiento', c1, '-12'],
    [prod8.lastInsertRowid, 'salida', 16, 'Instalacion oficinas', c1, '-5'],
    [prod9.lastInsertRowid, 'entrada', 50, 'Compra inicial', c2, '-29'],
    [prod9.lastInsertRowid, 'salida', 25, 'Cambio aceite', c2, '-20'],
    [prod9.lastInsertRowid, 'salida', 15, 'Servicio vehiculos', c2, '-12'],
    [prod9.lastInsertRowid, 'salida', 8, 'Mantenimiento flotilla', c2, '-5'],
    [prod11.lastInsertRowid, 'entrada', 40, 'Compra inicial', c2, '-27'],
    [prod11.lastInsertRowid, 'salida', 20, 'Servicio frenos', c2, '-18'],
    [prod11.lastInsertRowid, 'salida', 12, 'Mantenimiento', c2, '-9'],
    [prod11.lastInsertRowid, 'salida', 5, 'Reparacion', c2, '-3'],
  ];

  for (const m of movements) {
    insertMovement.run(...m);
  }

  console.log('Datos de prueba insertados exitosamente.');
  console.log('\nCuentas de prueba:');
  console.log('  Cliente 1: cliente1@civele.com / 123456');
  console.log('  Cliente 2: cliente2@civele.com / 123456');
  console.log('  Proveedor 1: proveedor1@civele.com / 123456');
  console.log('  Proveedor 2: proveedor2@civele.com / 123456');
}

seed().catch(console.error);
