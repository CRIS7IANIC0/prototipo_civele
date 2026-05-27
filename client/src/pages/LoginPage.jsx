import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

const ROLES = [
  {
    id: 'cliente',
    label: 'Ingresa como Cliente',
    description: 'Gestiona tu inventario y supervisa el stock de tus productos.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    id: 'proveedor',
    label: 'Ingresa como Proveedor',
    description: 'Revisa solicitudes de reposicion y gestiona pedidos de tus clientes.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
  },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [mode, setMode] = useState('select'); // 'select' | 'login' | 'register'
  const [form, setForm] = useState({ nombre: '', email: '', password: '', empresa: '', telefono: '' });
  const [error, setError] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  function handleRoleSelect(roleId) {
    setSelectedRole(roleId);
    setMode('login');
    setError('');
  }

  function handleBack() {
    setMode('select');
    setSelectedRole(null);
    setError('');
    setForm({ nombre: '', email: '', password: '', empresa: '', telefono: '' });
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate(result.rol === 'cliente' ? '/cliente' : '/proveedor');
    } else {
      setError(result.error);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (!form.nombre || !form.email || !form.password) {
      return setError('Nombre, email y contrasena son obligatorios');
    }
    const result = await register({ ...form, rol: selectedRole });
    if (result.success) {
      navigate(result.rol === 'cliente' ? '/cliente' : '/proveedor');
    } else {
      setError(result.error);
    }
  }

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="18" r="8" fill="white" opacity="0.9"/>
              <circle cx="10" cy="18" r="4" fill="#2563EB"/>
              <circle cx="28" cy="10" r="6" fill="white" opacity="0.7"/>
              <circle cx="28" cy="26" r="6" fill="white" opacity="0.7"/>
              <line x1="18" y1="14" x2="23" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="22" x2="23" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="login-logo-text">CIVELE</h1>
            <p className="login-logo-sub">Plataforma de Inventario Inteligente</p>
          </div>
        </div>

        {/* Panel principal */}
        <div className="login-card">
          {mode === 'select' && (
            <div className="login-role-select">
              <h2 className="login-card-title">Bienvenido</h2>
              <p className="login-card-subtitle">Selecciona tu tipo de acceso para continuar</p>

              <div className="role-cards">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    className="role-card"
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    <div className="role-card-icon">{role.icon}</div>
                    <div className="role-card-content">
                      <span className="role-card-label">{role.label}</span>
                      <span className="role-card-desc">{role.description}</span>
                    </div>
                    <svg className="role-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="login-form-view">
              {/* Header con boton de regreso */}
              <div className="login-form-header">
                <button className="btn btn-ghost btn-sm login-back-btn" onClick={handleBack}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Volver
                </button>
                <span className={`badge badge-${selectedRole === 'cliente' ? 'alerta' : 'normal'}`}>
                  {selectedRoleData?.label.replace('Ingresa como ', '')}
                </span>
              </div>

              <h2 className="login-card-title">
                {mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
              </h2>

              {error && (
                <div className="alert alert-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="login-form">
                {mode === 'register' && (
                  <>
                    <div className="input-group">
                      <label className="input-label">Nombre completo</label>
                      <input className="input" name="nombre" type="text" placeholder="Juan Perez" value={form.nombre} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Empresa (opcional)</label>
                      <input className="input" name="empresa" type="text" placeholder="Mi Empresa S.A.S" value={form.empresa} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Telefono (opcional)</label>
                      <input className="input" name="telefono" type="text" placeholder="300 123 4567" value={form.telefono} onChange={handleChange} />
                    </div>
                  </>
                )}

                <div className="input-group">
                  <label className="input-label">Correo electronico</label>
                  <input className="input" name="email" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} required />
                </div>

                <div className="input-group">
                  <label className="input-label">Contrasena</label>
                  <input className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? (
                    <span className="loading-spinner" />
                  ) : mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
                </button>
              </form>

              <p className="login-toggle-text">
                {mode === 'login' ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}
                <button className="login-toggle-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                  {mode === 'login' ? ' Registrate' : ' Inicia sesion'}
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="login-footer">
          CIVELE - Gestion de Inventario con Inteligencia Artificial
        </p>
      </div>
    </div>
  );
}
