const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'civele_secret_key_2024';
const JWT_EXPIRES = '24h';

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena son requeridos' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresa: user.empresa,
        telefono: user.telefono,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function register(req, res) {
  try {
    const { nombre, email, password, rol, empresa, telefono } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, email, contrasena, rol' });
    }

    if (!['cliente', 'proveedor'].includes(rol)) {
      return res.status(400).json({ error: 'El rol debe ser cliente o proveedor' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'El email ya esta registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO users (nombre, email, password_hash, rol, empresa, telefono)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, email, passwordHash, rol, empresa || null, telefono || null);

    const user = db.prepare('SELECT id, nombre, email, rol, empresa, telefono FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

function getProfile(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT id, nombre, email, rol, empresa, telefono, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
}

module.exports = { login, register, getProfile };
