import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService, supplierService } from '../services/notificationService';
import '../styles/index.css';
import '../styles/dashboard.css';

const URGENCY_LABEL = { critico:'CRITICO', urgente:'URGENTE', alerta:'ALERTA', normal:'Normal' };

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  return `hace ${Math.floor(diff/86400)} dias`;
}

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('pedidos');
  const [notifications, setNotifications] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { leida: filter === 'leidas' ? 'true' : 'false' } : {};
      const res = await notificationService.getAll(params);
      setNotifications(res.data);
    } catch(e) {}
    setLoading(false);
  }, [filter]);

  const loadClients = useCallback(async () => {
    try { const res = await supplierService.getMyClients(); setClients(res.data); } catch(e) {}
  }, []);

  useEffect(() => { loadNotifications(); loadClients(); }, []);
  useEffect(() => { loadNotifications(); }, [filter]);

  async function handleMarkRead(id) {
    try { await notificationService.markAsRead(id); loadNotifications(); } catch(e) {}
  }

  async function handleMarkAll() {
    try { await notificationService.markAllAsRead(); loadNotifications(); } catch(e) {}
  }

  const unreadCount = notifications.filter(n => !n.leida).length;
  const pendingOrders = notifications.filter(n => !n.leida && n.tipo === 'stock_bajo');

  const NAV = [
    { id: 'pedidos', label: 'Pedidos Pendientes', badge: pendingOrders.length },
    { id: 'historial', label: 'Historial' },
    { id: 'clientes', label: 'Mis Clientes' },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
              <circle cx="10" cy="18" r="8" fill="white" opacity="0.9"/>
              <circle cx="10" cy="18" r="4" fill="#2563EB"/>
              <circle cx="28" cy="10" r="6" fill="white" opacity="0.7"/>
              <circle cx="28" cy="26" r="6" fill="white" opacity="0.7"/>
              <line x1="18" y1="14" x2="23" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="22" x2="23" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div><div className="sidebar-logo-text">CIVELE</div><div className="sidebar-logo-sub">Proveedor</div></div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          {NAV.map(item => (
            <button key={item.id} className={`sidebar-nav-item${section === item.id ? ' active' : ''}`} onClick={() => setSection(item.id)}>
              <span>{item.label}</span>
              {item.badge > 0 && <span className="sidebar-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.nombre?.[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.nombre}</div>
              <div className="sidebar-user-role">{user?.empresa || 'Proveedor'}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm w-full" style={{marginTop:8}} onClick={()=>{logout();navigate('/');}}>Cerrar sesion</button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <div className="dashboard-header-title">{NAV.find(n=>n.id===section)?.label}</div>
            <div className="dashboard-header-sub">{unreadCount} solicitudes sin leer</div>
          </div>
          <div className="dashboard-header-actions">
            {unreadCount > 0 && <button className="btn btn-secondary btn-sm" onClick={handleMarkAll}>Marcar todo como leido</button>}
          </div>
        </header>

        <div className="dashboard-content">

          {/* STATS */}
          {section === 'pedidos' && (
            <div className="stats-grid" style={{marginBottom:20}}>
              {[
                {label:'Solicitudes Nuevas', value:pendingOrders.length, color:'#DC2626', bg:'#FEE2E2'},
                {label:'Total Recibidas', value:notifications.length, color:'#2563EB', bg:'#EFF6FF'},
                {label:'Clientes Activos', value:clients.length, color:'#16A34A', bg:'#DCFCE7'},
                {label:'Correos Enviados', value:notifications.filter(n=>n.email_enviado).length, color:'#D97706', bg:'#FEF3C7'},
              ].map((s,i) => (
                <div key={i} className="stat-card">
                  <div className="stat-card-icon" style={{background:s.bg,color:s.color}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.05 1.19h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 15.92z"/></svg>
                  </div>
                  <div className="stat-card-value" style={{color:s.color}}>{s.value}</div>
                  <div className="stat-card-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* FILTRO */}
          {(section === 'pedidos' || section === 'historial') && (
            <div className="toolbar" style={{marginBottom:16}}>
              {['all','no-leidas','leidas'].map(f => (
                <button key={f} className={`btn ${filter===f?'btn-primary':'btn-secondary'} btn-sm`} onClick={()=>setFilter(f)}>
                  {f==='all'?'Todas':f==='no-leidas'?'Sin leer':'Leidas'}
                </button>
              ))}
            </div>
          )}

          {/* LISTA NOTIFICACIONES */}
          {(section === 'pedidos' || section === 'historial') && (
            loading ? (
              <div style={{textAlign:'center',padding:40}}><span className="loading-spinner" style={{margin:'0 auto'}}/></div>
            ) : notifications.length === 0 ? (
              <div className="empty-state"><div className="empty-state-title">Sin solicitudes</div><p>Cuando un cliente tenga stock bajo recibiras una notificacion aqui</p></div>
            ) : (
              <div className="notif-list">
                {notifications.map(n => (
                  <div key={n.id} className={`notif-item${!n.leida?' unread':''}`}>
                    <div className="notif-item-icon" style={{background:n.urgencia==='critico'?'#FEE2E2':n.urgencia==='urgente'?'#FEF3C7':'#EFF6FF', color:n.urgencia==='critico'?'#DC2626':n.urgencia==='urgente'?'#D97706':'#2563EB'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4M12 16h.01"/></svg>
                    </div>
                    <div className="notif-item-content">
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span className="notif-item-title">{n.product_nombre || 'Producto'}</span>
                        <span className={`badge badge-${n.urgencia}`}>{URGENCY_LABEL[n.urgencia]}</span>
                        {n.email_enviado ? <span className="badge badge-normal" style={{fontSize:10}}>Correo enviado</span> : null}
                      </div>
                      <div style={{display:'flex',gap:16,marginBottom:6}}>
                        <span style={{fontSize:12,color:'var(--color-text-secondary)'}}>Cliente: <strong>{n.from_nombre}</strong></span>
                        <span style={{fontSize:12,color:'var(--color-primary)',fontWeight:700}}>Solicita: {n.cantidad_sugerida} {n.unidad}</span>
                      </div>
                      <div className="notif-item-msg">{n.mensaje}</div>
                      <div className="notif-item-time">{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.leida && (
                      <button className="btn btn-secondary btn-sm" onClick={()=>handleMarkRead(n.id)}>Marcar leida</button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* CLIENTES */}
          {section === 'clientes' && (
            clients.length === 0 ? (
              <div className="empty-state"><div className="empty-state-title">Sin clientes vinculados</div></div>
            ) : (
              <div className="supplier-list">
                {clients.map(c => (
                  <div key={c.id} className="supplier-item">
                    <div className="supplier-avatar" style={{background:'#EFF6FF',color:'#2563EB'}}>{c.nombre?.[0]?.toUpperCase()}</div>
                    <div className="supplier-info">
                      <div className="supplier-name">{c.nombre}</div>
                      <div className="supplier-sub">{c.empresa || c.email}</div>
                    </div>
                    <span className={`badge badge-${c.estado==='activo'?'normal':'urgente'}`}>{c.estado}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
