import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { inventoryService } from '../services/inventoryService';
import { notificationService, supplierService } from '../services/notificationService';
import '../styles/index.css';
import '../styles/dashboard.css';

const NAV_ITEMS = [
  { id: 'inventario', label: 'Inventario', icon: '▤' },
  { id: 'alertas', label: 'Alertas de Stock', icon: '⚠' },
  { id: 'proveedores', label: 'Proveedores', icon: '⊞' },
];

const URGENCY_LABEL = { critico:'CRITICO', urgente:'URGENTE', alerta:'ALERTA', normal:'Normal' };

function getUrgency(product) {
  if (product.stock_actual === 0) return 'critico';
  if (product.stock_actual <= product.stock_minimo) return 'urgente';
  const pct = product.stock_actual / product.stock_maximo;
  if (pct < 0.25) return 'alerta';
  return 'normal';
}

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('inventario');
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [movProduct, setMovProduct] = useState(null);
  const [form, setForm] = useState({ nombre:'', descripcion:'', categoria:'General', unidad:'unidades', precio_unitario:0, stock_actual:0, stock_minimo:5, stock_maximo:100, supplier_id:'' });
  const [movForm, setMovForm] = useState({ tipo:'entrada', cantidad:1, motivo:'' });
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [error, setError] = useState('');
  
  // Novedad: estado para modal de vincular proveedor
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getAll({ search });
      setProducts(res.data);
    } catch(e) { setError('Error cargando inventario'); }
    setLoading(false);
  }, [search]);

  const loadAlerts = useCallback(async () => {
    try { const res = await inventoryService.getAlerts(); setAlerts(res.data); } catch(e) {}
  }, []);

  const loadSuppliers = useCallback(async () => {
    try { 
      const res = await supplierService.getMySuppliers(); 
      setSuppliers(res.data); 
    } catch(e) {
      console.error("Error loading suppliers:", e);
    }
  }, []);

  const loadUnread = useCallback(async () => {
    try { const res = await notificationService.getUnreadCount(); setUnread(res.data.count); } catch(e) {}
  }, []);

  useEffect(() => { loadProducts(); loadAlerts(); loadSuppliers(); loadUnread(); }, []);
  useEffect(() => { loadProducts(); }, [search]);

  function handleLogout() { logout(); navigate('/'); }

  function openCreate() {
    setEditProduct(null);
    setForm({ nombre:'', descripcion:'', categoria:'General', unidad:'unidades', precio_unitario:0, stock_actual:0, stock_minimo:5, stock_maximo:100, supplier_id:'' });
    setShowModal(true);
  }

  function openEdit(p) {
    setEditProduct(p);
    setForm({ nombre:p.nombre, descripcion:p.descripcion||'', categoria:p.categoria, unidad:p.unidad, precio_unitario:p.precio_unitario, stock_actual:p.stock_actual, stock_minimo:p.stock_minimo, stock_maximo:p.stock_maximo, supplier_id:p.supplier_id||'' });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editProduct) await inventoryService.update(editProduct.id, form);
      else await inventoryService.create(form);
      setShowModal(false); loadProducts(); loadAlerts();
    } catch(e) { setError(e.response?.data?.error || 'Error guardando'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eliminar este producto?')) return;
    try { await inventoryService.remove(id); loadProducts(); loadAlerts(); } catch(e) {}
  }

  function openMovement(p) { setMovProduct(p); setMovForm({ tipo:'entrada', cantidad:1, motivo:'' }); setShowMovModal(true); }

  async function handleMovement(e) {
    e.preventDefault();
    try { await inventoryService.addMovement(movProduct.id, movForm); setShowMovModal(false); loadProducts(); loadAlerts(); } catch(e) { setError(e.response?.data?.error || 'Error'); }
  }

  async function handleAnalyze() {
    setAnalyzing(true); setAnalyzeResult(null);
    try { const res = await inventoryService.analyze(); setAnalyzeResult(res.data.summary); loadAlerts(); loadUnread(); } catch(e) {}
    setAnalyzing(false);
  }

  const critCount = products.filter(p => getUrgency(p) === 'critico').length;
  const urgCount = products.filter(p => ['urgente','alerta'].includes(getUrgency(p))).length;

  async function openLinkModal() {
    try {
      const res = await supplierService.getAllSuppliers();
      setAllSuppliers(res.data);
      setShowLinkModal(true);
      setError('');
    } catch(e) {
      setError('Error cargando proveedores disponibles');
    }
  }

  async function handleLinkSupplier(e) {
    e.preventDefault();
    if (!selectedSupplierId) return;
    try {
      await supplierService.link(selectedSupplierId);
      setShowLinkModal(false);
      loadSuppliers();
    } catch(e) {
      setError(e.response?.data?.error || 'Error al vincular proveedor');
    }
  }

  async function handleUnlinkSupplier(id) {
    if(!window.confirm('¿Desvincular este proveedor?')) return;
    try {
      await supplierService.unlink(id);
      loadSuppliers();
    } catch(e) {
      setError('Error al desvincular proveedor');
    }
  }

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
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
          <div><div className="sidebar-logo-text">CIVELE</div><div className="sidebar-logo-sub">Cliente</div></div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          {NAV_ITEMS.map(item => (
            <button key={item.id} className={`sidebar-nav-item${section === item.id ? ' active' : ''}`} onClick={() => setSection(item.id)}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'alertas' && alerts.length > 0 && <span className="sidebar-nav-badge">{alerts.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.nombre?.[0]?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.nombre}</div>
              <div className="sidebar-user-role">{user?.empresa || 'Cliente'}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm w-full" style={{marginTop:8}} onClick={handleLogout}>Cerrar sesion</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <div className="dashboard-header-title">{NAV_ITEMS.find(n=>n.id===section)?.label || 'Dashboard'}</div>
            <div className="dashboard-header-sub">Bienvenido, {user?.nombre}</div>
          </div>
          <div className="dashboard-header-actions">
            {section === 'inventario' && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Agregar Producto</button>}
            <div className="notif-btn">
              <button className="btn btn-secondary btn-icon" title="Notificaciones">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              {unread > 0 && <span className="notif-badge">{unread}</span>}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}<button style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer'}} onClick={()=>setError('')}>x</button></div>}

          {/* STATS */}
          {section === 'inventario' && (
            <>
              <div className="stats-grid">
                {[
                  {label:'Total Productos', value:products.length, sub:'en inventario', color:'#2563EB', bg:'#EFF6FF'},
                  {label:'Sin Stock', value:critCount, sub:'stock critico', color:'#DC2626', bg:'#FEE2E2'},
                  {label:'Stock Bajo', value:urgCount, sub:'requieren atencion', color:'#D97706', bg:'#FEF3C7'},
                  {label:'Proveedores', value:suppliers.length, sub:'vinculados', color:'#16A34A', bg:'#DCFCE7'},
                ].map((s,i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-card-icon" style={{background:s.bg, color:s.color}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    </div>
                    <div className="stat-card-value" style={{color:i>0?s.color:undefined}}>{s.value}</div>
                    <div className="stat-card-label">{s.label}</div>
                    <div className="stat-card-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Analyze Banner */}
              <div className="analyze-banner">
                <div className="analyze-banner-text">
                  <h3>Analisis de Inventario con IA</h3>
                  <p>Detecta stock bajo automaticamente y notifica a tus proveedores{analyzeResult && ` - Ultima revision: ${analyzeResult.total} alertas, ${analyzeResult.emailsSent} correos enviados`}</p>
                </div>
                <button className="btn" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? <span className="loading-spinner" style={{borderTopColor:'#2563EB'}}/> : 'Analizar Ahora'}
                </button>
              </div>

              {/* Toolbar */}
              <div className="toolbar">
                <div className="search-bar" style={{maxWidth:300}}>
                  <span className="search-bar-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </span>
                  <input className="input" placeholder="Buscar producto..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:36}} />
                </div>
              </div>

              {/* Tabla de inventario */}
              <div className="page-section">
                <div className="table-container" style={{border:'none'}}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Producto</th><th>Categoria</th><th>Stock Actual</th><th>Minimo</th><th>Nivel</th><th>Estado</th><th>Proveedor</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="8" style={{textAlign:'center',padding:32}}><span className="loading-spinner" style={{margin:'0 auto'}}/></td></tr>
                      ) : products.length === 0 ? (
                        <tr><td colSpan="8"><div className="empty-state"><div className="empty-state-title">Sin productos</div><p>Agrega tu primer producto con el boton de arriba</p></div></td></tr>
                      ) : products.map(p => {
                        const urg = getUrgency(p);
                        const pct = Math.min(100, Math.round((p.stock_actual / p.stock_maximo) * 100));
                        return (
                          <tr key={p.id}>
                            <td><div style={{fontWeight:600}}>{p.nombre}</div><div style={{fontSize:11,color:'var(--color-text-muted)'}}>{p.unidad}</div></td>
                            <td><span className="text-secondary text-sm">{p.categoria}</span></td>
                            <td><span style={{fontWeight:700,fontSize:16}}>{p.stock_actual}</span></td>
                            <td style={{color:'var(--color-text-secondary)'}}>{p.stock_minimo}</td>
                            <td style={{minWidth:120}}>
                              <div className="stock-bar"><div className={`stock-bar-fill ${urg}`} style={{width:`${pct}%`}}/></div>
                              <div style={{fontSize:10,color:'var(--color-text-muted)',marginTop:3}}>{pct}%</div>
                            </td>
                            <td><span className={`badge badge-${urg}`}>{URGENCY_LABEL[urg]}</span></td>
                            <td><span className="text-sm text-secondary">{p.supplier_nombre || '-'}</span></td>
                            <td>
                              <div style={{display:'flex',gap:6}}>
                                <button className="btn btn-secondary btn-sm" onClick={()=>openMovement(p)} title="Registrar movimiento">+/-</button>
                                <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(p)}>Editar</button>
                                <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(p.id)}>x</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ALERTAS */}
          {section === 'alertas' && (
            <div>
              <div className="analyze-banner" style={{marginBottom:20}}>
                <div className="analyze-banner-text">
                  <h3>Motor de Analisis IA</h3>
                  <p>Ejecuta un analisis completo para detectar stock bajo y notificar proveedores</p>
                </div>
                <button className="btn" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? <span className="loading-spinner" style={{borderTopColor:'#2563EB'}}/> : 'Analizar Stock'}
                </button>
              </div>
              {analyzeResult && (
                <div className="alert alert-success" style={{marginBottom:16}}>
                  Analisis completado: {analyzeResult.total} alertas detectadas | {analyzeResult.notificationsCreated} notificaciones creadas | {analyzeResult.emailsSent} correos enviados
                </div>
              )}
              {alerts.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">Sin alertas activas</div><p>Todos los productos tienen stock suficiente</p></div>
              ) : (
                <div className="alerts-list">
                  {alerts.map(a => (
                    <div key={a.product_id} className={`alert-item ${a.urgencia}`}>
                      <div className={`alert-item-dot ${a.urgencia}`}/>
                      <div className="alert-item-content">
                        <div className="alert-item-name">{a.nombre}</div>
                        <div className="alert-item-detail">{a.categoria} | Consumo: {a.consumo_diario} {a.unidad}/dia | Dias restantes: {a.dias_restantes === 999 ? 'N/A' : a.dias_restantes} | Proveedor: {a.supplier_nombre || 'Sin asignar'}</div>
                      </div>
                      <div className="alert-item-stock">
                        <div className={`alert-item-stock-val ${a.urgencia}`}>{a.stock_actual}</div>
                        <div className="alert-item-stock-label">actual</div>
                        <div style={{fontSize:11,color:'var(--color-primary)',fontWeight:600,marginTop:4}}>Pedir: {a.cantidad_sugerida}</div>
                      </div>
                      <span className={`badge badge-${a.urgencia}`}>{URGENCY_LABEL[a.urgencia]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROVEEDORES */}
          {section === 'proveedores' && (
            <div>
              <div className="dashboard-header-actions" style={{marginBottom: '20px'}}>
                <button className="btn btn-primary btn-sm" onClick={openLinkModal}>+ Vincular Proveedor</button>
              </div>
              {suppliers.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">Sin proveedores vinculados</div></div>
              ) : (
                <div className="supplier-list">
                  {suppliers.map(s => (
                    <div key={s.id} className="supplier-item">
                      <div className="supplier-avatar">{s.nombre?.[0]?.toUpperCase()}</div>
                      <div className="supplier-info">
                        <div className="supplier-name">{s.nombre}</div>
                        <div className="supplier-sub">{s.empresa || s.email}</div>
                      </div>
                      <span className={`badge badge-${s.estado === 'activo' ? 'normal' : 'urgente'}`}>{s.estado}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => handleUnlinkSupplier(s.id)}>Desvincular</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSave} className="product-form">
              <div className="input-group"><label className="input-label">Nombre</label><input className="input" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} required/></div>
              <div className="product-form-row">
                <div className="input-group"><label className="input-label">Categoria</label><input className="input" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}/></div>
                <div className="input-group"><label className="input-label">Unidad</label><input className="input" value={form.unidad} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))}/></div>
              </div>
              <div className="product-form-row">
                <div className="input-group"><label className="input-label">Stock Actual</label><input className="input" type="number" min="0" value={form.stock_actual} onChange={e=>setForm(f=>({...f,stock_actual:+e.target.value}))}/></div>
                <div className="input-group"><label className="input-label">Precio Unitario</label><input className="input" type="number" min="0" value={form.precio_unitario} onChange={e=>setForm(f=>({...f,precio_unitario:+e.target.value}))}/></div>
              </div>
              <div className="product-form-row">
                <div className="input-group"><label className="input-label">Stock Minimo</label><input className="input" type="number" min="0" value={form.stock_minimo} onChange={e=>setForm(f=>({...f,stock_minimo:+e.target.value}))}/></div>
                <div className="input-group"><label className="input-label">Stock Maximo</label><input className="input" type="number" min="1" value={form.stock_maximo} onChange={e=>setForm(f=>({...f,stock_maximo:+e.target.value}))}/></div>
              </div>
              <div className="input-group">
                <label className="input-label">Proveedor</label>
                <select className="select" value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre} - {s.empresa||s.email}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editProduct ? 'Guardar Cambios' : 'Crear Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO */}
      {showMovModal && movProduct && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowMovModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Registrar Movimiento</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowMovModal(false)}>x</button>
            </div>
            <p className="text-secondary text-sm" style={{marginBottom:16}}>{movProduct.nombre} | Stock actual: <strong>{movProduct.stock_actual} {movProduct.unidad}</strong></p>
            <form onSubmit={handleMovement}>
              <div className="movement-type-selector">
                {['entrada','salida'].map(t=>(
                  <button key={t} type="button" className={`movement-type-btn ${t}${movForm.tipo===t?' active':''}`} onClick={()=>setMovForm(f=>({...f,tipo:t}))}>
                    {t === 'entrada' ? '+ Entrada' : '- Salida'}
                  </button>
                ))}
              </div>
              <div style={{height:14}}/>
              <div className="input-group" style={{marginBottom:12}}><label className="input-label">Cantidad</label><input className="input" type="number" min="1" value={movForm.cantidad} onChange={e=>setMovForm(f=>({...f,cantidad:+e.target.value}))} required/></div>
              <div className="input-group"><label className="input-label">Motivo (opcional)</label><input className="input" value={movForm.motivo} onChange={e=>setMovForm(f=>({...f,motivo:e.target.value}))}/></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowMovModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR PROVEEDOR */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowLinkModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Vincular Proveedor</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowLinkModal(false)}>x</button>
            </div>
            <form onSubmit={handleLinkSupplier}>
              <div className="input-group" style={{marginBottom:12}}>
                <label className="input-label">Selecciona un proveedor</label>
                <select className="select" value={selectedSupplierId} onChange={e=>setSelectedSupplierId(e.target.value)} required>
                  <option value="">-- Elige un proveedor --</option>
                  {allSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} ({s.empresa || s.email})</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowLinkModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Vincular</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
