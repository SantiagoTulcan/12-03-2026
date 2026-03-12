// ============================================================
// app.js — StorePro Main Application
// OOP Architecture: Models → Services → Controllers → Views
// All variable names in Spanish, UI/comments in English
// ============================================================

"use strict";

// ══════════════════════════════════
// ENUMS
// ══════════════════════════════════
const EstadoPedido = {
  PENDIENTE:          "PENDING",
  EN_REVISION:        "UNDER_REVIEW",
  APROBADO:           "APPROVED",
  RECHAZADO:          "REJECTED",
  EN_COTIZACION:      "QUOTING",
  COTIZACION_ENVIADA: "QUOTE_SENT",
  COTIZACION_ACEPTADA:"QUOTE_ACCEPTED",
  ORDEN_PREPARADA:    "ORDER_PREPARED",
  EN_PROCESO:         "IN_PROCESS",
  COMPLETADO:         "COMPLETED",
  CANCELADO:          "CANCELLED"
};

const RolUsuario = {
  OFICINA_ENVIOS:   "SHIPPING_OFFICE",
  AGENTE_COMPRADOR: "BUYER_AGENT",
  SUPERVISOR:       "SUPERVISOR",
  VENDEDOR:         "SELLER",
  AGENTE_RECEPCION: "RECEIVE_AGENT"
};

// ══════════════════════════════════
// BASE CLASS: Entidad
// ══════════════════════════════════
class Entidad {
  constructor(id) {
    this.id = id || this._generarId();
    this.fechaCreacion   = new Date();
    this.fechaActualizacion = new Date();
  }

  _generarId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
  }

  getId() { return this.id; }

  _actualizarFecha() {
    this.fechaActualizacion = new Date();
  }

  toJSON() { return {}; }
}

// ══════════════════════════════════
// CLASS: Producto
// ══════════════════════════════════
class Producto extends Entidad {
  constructor(data) {
    super(data.id);
    this.nombre      = data.nombre || "Unknown";
    this.descripcion = data.descripcion || "";
    this.precio      = Number(data.precio) || 0;
    this.cantidad    = Number(data.cantidad) || 1;
    this.categoria   = data.categoria || "General";
  }

  actualizarPrecio(nuevoPrecio) {
    this.precio = nuevoPrecio;
    this._actualizarFecha();
  }

  toJSON() {
    return {
      id: this.id, nombre: this.nombre,
      descripcion: this.descripcion, precio: this.precio,
      cantidad: this.cantidad, categoria: this.categoria,
      fechaCreacion: this.fechaCreacion
    };
  }
}

// ══════════════════════════════════
// CLASS: Usuario
// ══════════════════════════════════
class Usuario extends Entidad {
  constructor(data) {
    super(data.id);
    this.nombre = data.nombre;
    this.email  = data.email;
    this.rol    = data.rol;
  }

  tienePermiso(accion) {
    const permisos = {
      [RolUsuario.OFICINA_ENVIOS]:   ["crear_requisicion"],
      [RolUsuario.AGENTE_COMPRADOR]: ["crear_rfq","revisar_cotizacion","crear_orden"],
      [RolUsuario.SUPERVISOR]:       ["aprobar_solicitud","rechazar_solicitud"],
      [RolUsuario.VENDEDOR]:         ["revisar_solicitud_cotizacion","crear_cotizacion","revisar_orden"],
      [RolUsuario.AGENTE_RECEPCION]: ["recibir_producto","confirmar_entrega"]
    };
    return (permisos[this.rol] || []).includes(accion);
  }

  toJSON() {
    return { id: this.id, nombre: this.nombre, email: this.email, rol: this.rol };
  }
}

// ══════════════════════════════════
// CLASS: Pedido
// ══════════════════════════════════
class Pedido extends Entidad {
  constructor(data) {
    super(data.id);
    this.titulo          = data.titulo;
    this.descripcion     = data.descripcion;
    this.estado          = data.estado || EstadoPedido.PENDIENTE;
    this.productos       = data.productos ? data.productos.map(p => p instanceof Producto ? p : new Producto(p)) : [];
    this.idCreador       = data.idCreador;
    this.rolCreador      = data.rolCreador;
    this.historial       = data.historial || [];
    this.necesitaRevision= data.necesitaRevision || false;
    this.aprobado        = data.aprobado || false;
    if (this.historial.length === 0) {
      this._agregarHistorial(EstadoPedido.PENDIENTE, "Request created");
    }
  }

  cambiarEstado(nuevoEstado, comentario = "") {
    this.estado = nuevoEstado;
    this._agregarHistorial(nuevoEstado, comentario);
    this._actualizarFecha();
  }

  _agregarHistorial(estado, comentario) {
    this.historial.push({ estado, fecha: new Date(), comentario });
  }

  agregarProducto(producto) {
    this.productos.push(producto);
    this._actualizarFecha();
  }

  calcularTotal() {
    return this.productos.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
  }

  toJSON() {
    return {
      id: this.id, titulo: this.titulo, descripcion: this.descripcion,
      estado: this.estado, productos: this.productos.map(p => p.toJSON()),
      idCreador: this.idCreador, rolCreador: this.rolCreador,
      necesitaRevision: this.necesitaRevision, aprobado: this.aprobado,
      historial: this.historial, fechaCreacion: this.fechaCreacion
    };
  }
}

// ══════════════════════════════════
// CLASS: Cotizacion
// ══════════════════════════════════
class Cotizacion extends Entidad {
  constructor(data) {
    super(data.id);
    this.idPedido    = data.idPedido;
    this.precio      = Number(data.precio) || 0;
    this.descripcion = data.descripcion;
    this.aceptada    = data.aceptada || false;
    this.revisada    = data.revisada || false;
    this.notas       = data.notas || "";
  }

  aceptar() {
    this.aceptada = true; this.revisada = true;
    this._actualizarFecha();
  }

  rechazar(motivo) {
    this.aceptada = false; this.revisada = true;
    this.notas = motivo; this._actualizarFecha();
  }

  toJSON() {
    return {
      id: this.id, idPedido: this.idPedido, precio: this.precio,
      descripcion: this.descripcion, aceptada: this.aceptada,
      revisada: this.revisada, notas: this.notas, fechaCreacion: this.fechaCreacion
    };
  }
}

// ══════════════════════════════════
// CLASS: Orden
// ══════════════════════════════════
class Orden extends Entidad {
  constructor(data) {
    super(data.id);
    this.idPedido          = data.idPedido;
    this.idCotizacion      = data.idCotizacion;
    this.total             = Number(data.total) || 0;
    this.estado            = data.estado || EstadoPedido.ORDEN_PREPARADA;
    this.facturaGenerada   = data.facturaGenerada || false;
    this.pagoRecibido      = data.pagoRecibido || false;
    this.productoEntregado = data.productoEntregado || false;
    this.notaEntrega       = data.notaEntrega || "";
  }

  generarFactura() {
    this.facturaGenerada = true;
    this.estado = EstadoPedido.EN_PROCESO;
    this._actualizarFecha();
  }

  registrarPago() {
    this.pagoRecibido = true; this._actualizarFecha();
  }

  completarEntrega(nota) {
    this.productoEntregado = true;
    this.notaEntrega = nota;
    this.estado = EstadoPedido.COMPLETADO;
    this._actualizarFecha();
  }

  toJSON() {
    return {
      id: this.id, idPedido: this.idPedido, idCotizacion: this.idCotizacion,
      total: this.total, estado: this.estado,
      facturaGenerada: this.facturaGenerada, pagoRecibido: this.pagoRecibido,
      productoEntregado: this.productoEntregado, notaEntrega: this.notaEntrega,
      fechaCreacion: this.fechaCreacion
    };
  }
}

// ══════════════════════════════════
// SERVICE: ServicioProcuramiento
// ══════════════════════════════════
class ServicioProcuramiento {
  constructor() {
    this.listaPedidos       = [];
    this.listaCotizaciones  = [];
    this.listaOrdenes       = [];
    this.usuarioActual      = null;
    this._callbacks         = {};
    this._cargarDatos();
    this._inicializarDemo();
  }

  on(evento, cb) {
    if (!this._callbacks[evento]) this._callbacks[evento] = [];
    this._callbacks[evento].push(cb);
  }

  _emitir(evento, datos) {
    (this._callbacks[evento] || []).forEach(cb => cb(datos));
  }

  setUsuarioActual(usuario) {
    this.usuarioActual = usuario;
    this._emitir('usuario:cambio', usuario);
  }

  _cargarDatos() {
    try {
      const dp = localStorage.getItem('store_pedidos');
      if (dp) this.listaPedidos = JSON.parse(dp).map(d => new Pedido(d));

      const dc = localStorage.getItem('store_cotizaciones');
      if (dc) this.listaCotizaciones = JSON.parse(dc).map(d => new Cotizacion(d));

      const do_ = localStorage.getItem('store_ordenes');
      if (do_) this.listaOrdenes = JSON.parse(do_).map(d => new Orden(d));
    } catch(e) {
      console.warn('Could not load stored data:', e);
    }
  }

  _guardarTodo() {
    localStorage.setItem('store_pedidos',       JSON.stringify(this.listaPedidos.map(p=>p.toJSON())));
    localStorage.setItem('store_cotizaciones',  JSON.stringify(this.listaCotizaciones.map(c=>c.toJSON())));
    localStorage.setItem('store_ordenes',       JSON.stringify(this.listaOrdenes.map(o=>o.toJSON())));
  }

  _inicializarDemo() {
    if (this.listaPedidos.length > 0) return;

    const p1 = new Pedido({
      titulo: "Office Supplies — Requisition",
      descripcion: "Monthly office supplies including paper, pens, and folders for the main office.",
      idCreador: "user-demo", rolCreador: RolUsuario.OFICINA_ENVIOS
    });
    p1.agregarProducto(new Producto({ nombre: "A4 Paper (500 sheets)", precio: 12.50, cantidad: 10, categoria: "Office" }));
    p1.agregarProducto(new Producto({ nombre: "Ballpoint Pens (Box)", precio: 5.00, cantidad: 5, categoria: "Office" }));
    p1.necesitaRevision = true;
    p1.cambiarEstado(EstadoPedido.EN_REVISION, "Sent for buyer review");

    const p2 = new Pedido({
      titulo: "IT Equipment — Accounting Dept.",
      descripcion: "Replacement keyboards and mice for accounting department — 3 units each.",
      idCreador: "user-demo", rolCreador: RolUsuario.OFICINA_ENVIOS
    });
    p2.agregarProducto(new Producto({ nombre: "Mechanical Keyboard", precio: 89.99, cantidad: 3, categoria: "IT" }));
    p2.agregarProducto(new Producto({ nombre: "Wireless Mouse", precio: 35.00, cantidad: 3, categoria: "IT" }));
    p2.aprobado = true;
    p2.cambiarEstado(EstadoPedido.APROBADO, "Approved by supervisor");

    const p3 = new Pedido({
      titulo: "Cleaning Supplies — Monthly",
      descripcion: "Standard monthly cleaning supplies order.",
      idCreador: "user-demo", rolCreador: RolUsuario.OFICINA_ENVIOS
    });
    p3.agregarProducto(new Producto({ nombre: "Disinfectant Spray (6-pack)", precio: 18.00, cantidad: 4, categoria: "Cleaning" }));
    p3.aprobado = true;
    p3.cambiarEstado(EstadoPedido.COTIZACION_ACEPTADA, "Quote accepted");

    const cot1 = new Cotizacion({
      idPedido: p3.getId(),
      precio: 72.00,
      descripcion: "Supply of 4×6-pack disinfectant spray. Delivery within 5 business days. Price includes VAT."
    });
    cot1.aceptar();

    const ord1 = new Orden({ idPedido: p3.getId(), idCotizacion: cot1.getId(), total: cot1.precio });
    ord1.generarFactura();
    ord1.registrarPago();
    ord1.completarEntrega("Delivered to reception desk — signed by Maria L.");

    p3.cambiarEstado(EstadoPedido.COMPLETADO, "Order fulfilled");

    this.listaPedidos      = [p1, p2, p3];
    this.listaCotizaciones = [cot1];
    this.listaOrdenes      = [ord1];
    this._guardarTodo();
  }

  // ── STEP 1: Create Requisition ──
  crearRequisicion(titulo, descripcion, listaProductos) {
    const pedido = new Pedido({
      titulo, descripcion,
      idCreador: this.usuarioActual?.getId() || "anonymous",
      rolCreador: RolUsuario.OFICINA_ENVIOS
    });
    listaProductos.forEach(p => pedido.agregarProducto(p));
    this.listaPedidos.push(pedido);
    this._guardarTodo();
    this._emitir('pedido:creado', pedido);
    return pedido;
  }

  // ── STEP 2: Buyer — Prepare RFQ ──
  prepararRFQ(idPedido, necesitaRevision) {
    const pedido = this.buscarPedido(idPedido);
    if (!pedido) return null;
    pedido.necesitaRevision = necesitaRevision;
    pedido.cambiarEstado(
      necesitaRevision ? EstadoPedido.EN_REVISION : EstadoPedido.EN_COTIZACION,
      necesitaRevision ? "RFQ sent for supervisor review" : "RFQ prepared — sent to seller"
    );
    this._guardarTodo();
    this._emitir('pedido:actualizado', pedido);
    return pedido;
  }

  // ── STEP 3: Supervisor — Approve/Reject ──
  aprobarSolicitud(idPedido, aprobado, comentario) {
    const pedido = this.buscarPedido(idPedido);
    if (!pedido) return null;
    pedido.aprobado = aprobado;
    pedido.cambiarEstado(
      aprobado ? EstadoPedido.APROBADO : EstadoPedido.RECHAZADO,
      comentario || (aprobado ? "Approved by supervisor" : "Rejected by supervisor")
    );
    this._guardarTodo();
    this._emitir('pedido:actualizado', pedido);
    return pedido;
  }

  // ── STEP 4: Seller — Create Quote ──
  crearCotizacion(idPedido, precio, descripcion, decideCotizar) {
    const pedido = this.buscarPedido(idPedido);
    if (!decideCotizar) {
      if (pedido) pedido.cambiarEstado(EstadoPedido.RECHAZADO, "Seller declined to quote");
      this._guardarTodo();
      return null;
    }
    const cotizacion = new Cotizacion({ idPedido, precio: Number(precio), descripcion });
    this.listaCotizaciones.push(cotizacion);
    if (pedido) pedido.cambiarEstado(EstadoPedido.COTIZACION_ENVIADA, "Quote prepared and sent to buyer");
    this._guardarTodo();
    this._emitir('cotizacion:creada', cotizacion);
    return cotizacion;
  }

  // ── STEP 5: Buyer — Review Quote ──
  revisarCotizacion(idCotizacion, aceptada, notas = "") {
    const cotizacion = this.buscarCotizacion(idCotizacion);
    if (!cotizacion) return null;
    const pedido = this.buscarPedido(cotizacion.idPedido);
    if (aceptada) {
      cotizacion.aceptar();
      if (pedido) pedido.cambiarEstado(EstadoPedido.COTIZACION_ACEPTADA, "Quote accepted by buyer");
    } else {
      cotizacion.rechazar(notas);
      if (pedido) pedido.cambiarEstado(EstadoPedido.EN_COTIZACION, "Quote rejected — revised quote requested");
    }
    this._guardarTodo();
    this._emitir('cotizacion:actualizada', cotizacion);
    return cotizacion;
  }

  // ── STEP 6: Create Order ──
  crearOrden(idPedido, idCotizacion) {
    const pedido     = this.buscarPedido(idPedido);
    const cotizacion = this.buscarCotizacion(idCotizacion);
    if (!pedido || !cotizacion) return null;
    const orden = new Orden({ idPedido, idCotizacion, total: cotizacion.precio });
    this.listaOrdenes.push(orden);
    pedido.cambiarEstado(EstadoPedido.ORDEN_PREPARADA, "Order preparation complete");
    this._guardarTodo();
    this._emitir('orden:creada', orden);
    return orden;
  }

  // ── STEP 7: Seller — Review Order ──
  revisarOrden(idOrden, aceptada, notas = "") {
    const orden  = this.buscarOrden(idOrden);
    if (!orden) return null;
    const pedido = this.buscarPedido(orden.idPedido);
    if (aceptada) {
      orden.estado = EstadoPedido.EN_PROCESO;
      if (pedido) pedido.cambiarEstado(EstadoPedido.EN_PROCESO, "Order accepted by seller — fulfilling");
    } else {
      orden.estado = EstadoPedido.RECHAZADO;
      if (pedido) pedido.cambiarEstado(EstadoPedido.RECHAZADO, `Order rejected by seller: ${notas}`);
    }
    this._guardarTodo();
    this._emitir('orden:actualizada', orden);
    return orden;
  }

  // ── STEP 8: Complete Order ──
  completarOrden(idOrden, notaEntrega) {
    const orden  = this.buscarOrden(idOrden);
    if (!orden) return null;
    orden.generarFactura();
    orden.registrarPago();
    orden.completarEntrega(notaEntrega || "Product delivered successfully");
    const pedido = this.buscarPedido(orden.idPedido);
    if (pedido) pedido.cambiarEstado(EstadoPedido.COMPLETADO, "Order fulfilled — product received");
    this._guardarTodo();
    this._emitir('orden:completada', orden);
    return orden;
  }

  // ── Getters ──
  getPedidos()       { return this.listaPedidos; }
  getCotizaciones()  { return this.listaCotizaciones; }
  getOrdenes()       { return this.listaOrdenes; }

  buscarPedido(id)      { return this.listaPedidos.find(p => p.getId() === id); }
  buscarCotizacion(id)  { return this.listaCotizaciones.find(c => c.getId() === id); }
  buscarOrden(id)       { return this.listaOrdenes.find(o => o.getId() === id); }

  getCotizacionesPorPedido(idPedido) {
    return this.listaCotizaciones.filter(c => c.idPedido === idPedido);
  }

  getOrdenPorPedido(idPedido) {
    return this.listaOrdenes.find(o => o.idPedido === idPedido);
  }

  limpiarDatos() {
    this.listaPedidos = []; this.listaCotizaciones = []; this.listaOrdenes = [];
    localStorage.removeItem('store_pedidos');
    localStorage.removeItem('store_cotizaciones');
    localStorage.removeItem('store_ordenes');
    this._emitir('datos:limpiados');
  }

  getEstadisticas() {
    return {
      totalPedidos:          this.listaPedidos.length,
      pedidosPendientes:     this.listaPedidos.filter(p => p.estado === EstadoPedido.PENDIENTE).length,
      pedidosAprobados:      this.listaPedidos.filter(p => p.aprobado).length,
      pedidosCompletados:    this.listaPedidos.filter(p => p.estado === EstadoPedido.COMPLETADO).length,
      totalCotizaciones:     this.listaCotizaciones.length,
      cotizacionesAceptadas: this.listaCotizaciones.filter(c => c.aceptada).length,
      totalOrdenes:          this.listaOrdenes.length,
      ordenesCompletadas:    this.listaOrdenes.filter(o => o.estado === EstadoPedido.COMPLETADO).length,
      valorTotal:            this.listaOrdenes.reduce((s,o) => s + o.total, 0)
    };
  }
}

// ══════════════════════════════════
// CONTROLLER: ControladorVistas
// ══════════════════════════════════
class ControladorVistas {
  constructor(servicio) {
    this.servicio      = servicio;
    this.vistaActual   = 'dashboard';
    this.listaProductosForm = [];
    this._initEventos();
    this._initEditor();
    this.renderizarVista('dashboard');
  }

  // ── Navigation ──
  _initEventos() {
    // Nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const vista = btn.dataset.view;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderizarVista(vista);
      });
    });

    // Role switcher
    document.getElementById('roleSelect').addEventListener('change', (e) => {
      const rolMap = {
        'SHIPPING_OFFICE': { nombre:'Shipping Officer', rol: RolUsuario.OFICINA_ENVIOS },
        'BUYER_AGENT':     { nombre:'Buyer Agent',      rol: RolUsuario.AGENTE_COMPRADOR },
        'SUPERVISOR':      { nombre:'Supervisor',       rol: RolUsuario.SUPERVISOR },
        'SELLER':          { nombre:'Seller',           rol: RolUsuario.VENDEDOR },
        'RECEIVE_AGENT':   { nombre:'Receive Agent',    rol: RolUsuario.AGENTE_RECEPCION }
      };
      const info = rolMap[e.target.value];
      const usuario = new Usuario({ nombre: info.nombre, email: `${e.target.value.toLowerCase()}@store.com`, rol: info.rol });
      this.servicio.setUsuarioActual(usuario);
      document.getElementById('currentRole').textContent = info.nombre;
      this.mostrarToast(`Switched to ${info.nombre}`, 'info');
      this.renderizarVista(this.vistaActual);
    });

    // Clear data
    document.getElementById('clearDataBtn').addEventListener('click', () => {
      if (confirm('Clear all demo data? This cannot be undone.')) {
        this.servicio.limpiarDatos();
        this.mostrarToast('All data cleared', 'warning');
        this.renderizarVista(this.vistaActual);
      }
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', () => this.cerrarModal());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modalOverlay')) this.cerrarModal();
    });
  }

  renderizarVista(nombreVista) {
    this.vistaActual = nombreVista;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const vista = document.getElementById(`view-${nombreVista}`);
    if (vista) vista.classList.add('active');

    const titulos = {
      dashboard:    ['Dashboard', 'Overview of procurement activity'],
      requisitions: ['Requisitions', 'Manage purchase requests & RFQs'],
      quotes:       ['Quotes',        'View and manage supplier quotes'],
      orders:       ['Orders',        'Track and fulfill orders'],
      workflow:     ['Workflow',      'Live procurement process view'],
      editor:       ['Code Editor',   'Browse & edit TypeScript source files']
    };
    const [titulo, subtitulo] = titulos[nombreVista] || ['', ''];
    document.getElementById('pageTitle').textContent = titulo;
    document.getElementById('pageSubtitle').textContent = subtitulo;

    const renderMap = {
      dashboard:    () => this._renderDashboard(),
      requisitions: () => this._renderRequisiciones(),
      quotes:       () => this._renderCotizaciones(),
      orders:       () => this._renderOrdenes(),
      workflow:     () => this._renderWorkflow(),
      editor:       () => {} // initialized once
    };
    renderMap[nombreVista]?.();
  }

  // ── DASHBOARD ──
  _renderDashboard() {
    const stats = this.servicio.getEstadisticas();
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
      <div class="stat-card blue">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${stats.totalPedidos}</div>
        <div class="stat-label">Total Requisitions</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${stats.pedidosPendientes}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${stats.pedidosCompletados}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">💰</div>
        <div class="stat-value">$${stats.valorTotal.toFixed(2)}</div>
        <div class="stat-label">Total Order Value</div>
      </div>
      <div class="stat-card blue" style="border-top-color:var(--violet,#8b5cf6)">
        <div class="stat-icon">💬</div>
        <div class="stat-value">${stats.totalCotizaciones}</div>
        <div class="stat-label">Quotes</div>
      </div>
      <div class="stat-card green" style="border-top-color:var(--teal)">
        <div class="stat-icon">🚀</div>
        <div class="stat-value">${stats.totalOrdenes}</div>
        <div class="stat-label">Orders</div>
      </div>
    `;

    // Recent requisitions
    const recientes = this.servicio.getPedidos().slice(-4).reverse();
    document.getElementById('recentRequisitions').innerHTML = recientes.length
      ? recientes.map(p => `
        <div class="list-item">
          <div>
            <div class="list-item-title">${p.titulo}</div>
            <div class="list-item-meta">${p.productos.length} products · $${p.calcularTotal().toFixed(2)}</div>
          </div>
          <span class="badge ${this._badgeClass(p.estado)}">${this._estadoLabel(p.estado)}</span>
        </div>`).join('')
      : '<div class="empty-state">No requisitions yet</div>';

    // Workflow mini
    const wfSteps = [
      { label: 'Shipping Office', icon: '📦', estado: EstadoPedido.PENDIENTE },
      { label: 'Buyer Agent',     icon: '🛒', estado: EstadoPedido.EN_REVISION },
      { label: 'Supervisor',      icon: '👔', estado: EstadoPedido.APROBADO },
      { label: 'Seller',          icon: '🏪', estado: EstadoPedido.COTIZACION_ENVIADA },
      { label: 'Receive Agent',   icon: '📬', estado: EstadoPedido.COMPLETADO }
    ];
    const pedidoActivo = this.servicio.getPedidos().find(p => p.estado !== EstadoPedido.COMPLETADO && p.estado !== EstadoPedido.RECHAZADO) || this.servicio.getPedidos()[0];
    document.getElementById('workflowMini').innerHTML = wfSteps.map(step => {
      const activo = pedidoActivo && this._esEstadoActivo(pedidoActivo.estado, step.estado);
      return `
        <div class="wf-mini-step">
          <div class="wf-mini-dot" style="background:${activo ? 'var(--accent)' : 'var(--text-muted)'}"></div>
          <span>${step.icon} ${step.label}</span>
          ${activo ? `<span class="badge badge-review" style="margin-left:auto;font-size:10px">ACTIVE</span>` : ''}
        </div>`;
    }).join('');
  }

  _esEstadoActivo(estadoActual, estadoLane) {
    const mapaLane = {
      [EstadoPedido.PENDIENTE]:           [EstadoPedido.PENDIENTE],
      [EstadoPedido.EN_REVISION]:         [EstadoPedido.EN_REVISION],
      [EstadoPedido.APROBADO]:            [EstadoPedido.APROBADO],
      [EstadoPedido.COTIZACION_ENVIADA]:  [EstadoPedido.EN_COTIZACION, EstadoPedido.COTIZACION_ENVIADA, EstadoPedido.COTIZACION_ACEPTADA, EstadoPedido.ORDEN_PREPARADA],
      [EstadoPedido.COMPLETADO]:          [EstadoPedido.EN_PROCESO, EstadoPedido.COMPLETADO]
    };
    return (mapaLane[estadoLane] || []).includes(estadoActual);
  }

  // ── REQUISITIONS ──
  _renderRequisiciones() {
    const btn = document.getElementById('newRequisitionBtn');
    btn.onclick = () => {
      const form = document.getElementById('requisitionForm');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      this.listaProductosForm = [];
      document.getElementById('productsList').innerHTML = '';
      this._agregarFilaProducto();
    };

    document.getElementById('cancelReqBtn').onclick = () => {
      document.getElementById('requisitionForm').style.display = 'none';
    };

    document.getElementById('addProductBtn').onclick = () => this._agregarFilaProducto();

    document.getElementById('submitReqBtn').onclick = () => {
      const titulo = document.getElementById('reqTitle').value.trim();
      const desc   = document.getElementById('reqDesc').value.trim();
      if (!titulo) { this.mostrarToast('Title is required', 'error'); return; }

      const filas = document.querySelectorAll('.product-row');
      const productos = [];
      filas.forEach(fila => {
        const inputs = fila.querySelectorAll('input');
        const nombre = inputs[0]?.value.trim();
        if (nombre) {
          productos.push(new Producto({
            nombre, descripcion: '',
            precio: parseFloat(inputs[1]?.value) || 0,
            cantidad: parseInt(inputs[2]?.value) || 1,
            categoria: inputs[3]?.value || 'General'
          }));
        }
      });

      if (productos.length === 0) { this.mostrarToast('Add at least one product', 'error'); return; }

      this.servicio.crearRequisicion(titulo, desc, productos);
      document.getElementById('requisitionForm').style.display = 'none';
      document.getElementById('reqTitle').value = '';
      document.getElementById('reqDesc').value = '';
      this.mostrarToast('Requisition created successfully!', 'success');
      this._renderRequisiciones();
    };

    // Search
    document.getElementById('searchRequisitions').oninput = (e) => {
      this._poblarTablaRequisiciones(e.target.value.toLowerCase());
    };

    this._poblarTablaRequisiciones('');
  }

  _agregarFilaProducto() {
    const lista = document.getElementById('productsList');
    const fila = document.createElement('div');
    fila.className = 'product-row';
    fila.innerHTML = `
      <input class="input" placeholder="Product name" />
      <input class="input" type="number" placeholder="Price" step="0.01" min="0" />
      <input class="input" type="number" placeholder="Qty" min="1" value="1" />
      <input class="input" placeholder="Category" />
      <button class="btn btn-sm btn-danger" onclick="this.closest('.product-row').remove()">✕</button>
    `;
    lista.appendChild(fila);
  }

  _poblarTablaRequisiciones(filtro) {
    const pedidos = this.servicio.getPedidos()
      .filter(p => !filtro || p.titulo.toLowerCase().includes(filtro) || p.descripcion.toLowerCase().includes(filtro));
    const tbody = document.getElementById('requisitionsBody');
    if (pedidos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No requisitions found</div></td></tr>`;
      return;
    }
    tbody.innerHTML = pedidos.map(p => `
      <tr>
        <td><span class="id-chip">${p.getId().slice(-8)}</span></td>
        <td><strong>${p.titulo}</strong><br><small style="color:var(--text-muted)">${p.descripcion.slice(0,50)}…</small></td>
        <td><span class="badge ${this._badgeClass(p.estado)}">${this._estadoLabel(p.estado)}</span></td>
        <td>${p.productos.length} items</td>
        <td><strong>$${p.calcularTotal().toFixed(2)}</strong></td>
        <td style="color:var(--text-muted);font-size:12px">${new Date(p.fechaCreacion).toLocaleDateString()}</td>
        <td>
          <div class="action-row">
            <button class="btn btn-sm" onclick="app.verDetallePedido('${p.getId()}')">View</button>
            ${this._botonesAccionPedido(p)}
          </div>
        </td>
      </tr>`).join('');
  }

  _botonesAccionPedido(pedido) {
    const rol = this.servicio.usuarioActual?.rol;
    let btns = '';
    if (rol === RolUsuario.AGENTE_COMPRADOR && pedido.estado === EstadoPedido.PENDIENTE) {
      btns += `<button class="btn btn-sm btn-primary" onclick="app.prepararRFQ('${pedido.getId()}')">Prepare RFQ</button>`;
    }
    if (rol === RolUsuario.SUPERVISOR && (pedido.estado === EstadoPedido.EN_REVISION || pedido.estado === EstadoPedido.EN_COTIZACION)) {
      btns += `
        <button class="btn btn-sm btn-success" onclick="app.aprobarPedido('${pedido.getId()}', true)">✓ Approve</button>
        <button class="btn btn-sm btn-danger"  onclick="app.aprobarPedido('${pedido.getId()}', false)">✗ Reject</button>`;
    }
    return btns;
  }

  // ── QUOTES ──
  _renderCotizaciones() {
    document.getElementById('newQuoteBtn').onclick = () => {
      const form = document.getElementById('quoteForm');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      if (form.style.display === 'block') this._llenarSelectPedidosParaCotizar();
    };

    document.getElementById('cancelQuoteBtn').onclick = () => {
      document.getElementById('quoteForm').style.display = 'none';
    };

    document.getElementById('submitQuoteBtn').onclick = () => {
      const idPedido = document.getElementById('quotePedidoSelect').value;
      const precio   = document.getElementById('quotePrice').value;
      const desc     = document.getElementById('quoteDesc').value.trim();
      if (!idPedido || !precio || !desc) {
        this.mostrarToast('All fields are required', 'error'); return;
      }
      const cot = this.servicio.crearCotizacion(idPedido, precio, desc, true);
      if (cot) {
        document.getElementById('quoteForm').style.display = 'none';
        document.getElementById('quotePrice').value = '';
        document.getElementById('quoteDesc').value = '';
        this.mostrarToast('Quote created successfully!', 'success');
        this._renderCotizaciones();
      }
    };

    this._poblarTablaCotizaciones();
  }

  _llenarSelectPedidosParaCotizar() {
    const select = document.getElementById('quotePedidoSelect');
    const pedidosElegibles = this.servicio.getPedidos().filter(p =>
      [EstadoPedido.APROBADO, EstadoPedido.EN_COTIZACION].includes(p.estado)
    );
    select.innerHTML = pedidosElegibles.length
      ? `<option value="">— Select Requisition —</option>` + pedidosElegibles.map(p =>
          `<option value="${p.getId()}">${p.titulo}</option>`).join('')
      : `<option value="">No eligible requisitions found</option>`;
  }

  _poblarTablaCotizaciones() {
    const cotizaciones = this.servicio.getCotizaciones();
    const tbody = document.getElementById('quotesBody');
    if (cotizaciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No quotes yet</div></td></tr>`;
      return;
    }
    tbody.innerHTML = cotizaciones.map(c => {
      const pedido = this.servicio.buscarPedido(c.idPedido);
      return `
        <tr>
          <td><span class="id-chip">${c.getId().slice(-8)}</span></td>
          <td>${pedido?.titulo || 'Unknown'}</td>
          <td><strong>$${c.precio.toFixed(2)}</strong></td>
          <td>
            ${c.aceptada ? '<span class="badge badge-approved">Accepted</span>'
              : c.revisada ? '<span class="badge badge-rejected">Rejected</span>'
              : '<span class="badge badge-pending">Pending Review</span>'}
          </td>
          <td style="font-size:12px;color:var(--text-muted)">${c.notas || '—'}</td>
          <td style="color:var(--text-muted);font-size:12px">${new Date(c.fechaCreacion).toLocaleDateString()}</td>
          <td>
            <div class="action-row">
              ${!c.revisada && this.servicio.usuarioActual?.rol === RolUsuario.AGENTE_COMPRADOR ? `
                <button class="btn btn-sm btn-success" onclick="app.revisarCotizacion('${c.getId()}', true)">✓ Accept</button>
                <button class="btn btn-sm btn-danger"  onclick="app.revisarCotizacion('${c.getId()}', false)">✗ Reject</button>
              ` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ── ORDERS ──
  _renderOrdenes() {
    document.getElementById('createOrderBtn').onclick = () => {
      const form = document.getElementById('orderForm');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      if (form.style.display === 'block') this._llenarSelectCotizacionesAceptadas();
    };

    document.getElementById('cancelOrderBtn').onclick = () => {
      document.getElementById('orderForm').style.display = 'none';
    };

    document.getElementById('submitOrderBtn').onclick = () => {
      const val = document.getElementById('orderQuoteSelect').value;
      if (!val) { this.mostrarToast('Select a quote', 'error'); return; }
      const [idPedido, idCotizacion] = val.split('|');
      const orden = this.servicio.crearOrden(idPedido, idCotizacion);
      if (orden) {
        document.getElementById('orderForm').style.display = 'none';
        this.mostrarToast('Order created!', 'success');
        this._renderOrdenes();
      }
    };

    this._poblarTablaOrdenes();
  }

  _llenarSelectCotizacionesAceptadas() {
    const select = document.getElementById('orderQuoteSelect');
    const elegibles = this.servicio.getCotizaciones().filter(c => c.aceptada && !this.servicio.getOrdenPorPedido(c.idPedido));
    select.innerHTML = elegibles.length
      ? `<option value="">— Select Quote —</option>` + elegibles.map(c => {
          const p = this.servicio.buscarPedido(c.idPedido);
          return `<option value="${c.idPedido}|${c.getId()}">${p?.titulo || 'Unknown'} — $${c.precio.toFixed(2)}</option>`;
        }).join('')
      : `<option value="">No accepted quotes without orders</option>`;
  }

  _poblarTablaOrdenes() {
    const ordenes = this.servicio.getOrdenes();
    const tbody = document.getElementById('ordersBody');
    if (ordenes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">No orders yet</div></td></tr>`;
      return;
    }
    tbody.innerHTML = ordenes.map(o => {
      const pedido = this.servicio.buscarPedido(o.idPedido);
      return `
        <tr>
          <td><span class="id-chip">${o.getId().slice(-8)}</span></td>
          <td>${pedido?.titulo || 'Unknown'}</td>
          <td><strong>$${o.total.toFixed(2)}</strong></td>
          <td><span class="badge ${this._badgeClass(o.estado)}">${this._estadoLabel(o.estado)}</span></td>
          <td>${o.facturaGenerada ? '✅' : '⏳'}</td>
          <td>${o.pagoRecibido ? '✅' : '⏳'}</td>
          <td style="color:var(--text-muted);font-size:12px">${new Date(o.fechaCreacion).toLocaleDateString()}</td>
          <td>
            <div class="action-row">
              ${o.estado === EstadoPedido.ORDEN_PREPARADA && this.servicio.usuarioActual?.rol === RolUsuario.VENDEDOR ? `
                <button class="btn btn-sm btn-success" onclick="app.revisarOrden('${o.getId()}', true)">Accept</button>
                <button class="btn btn-sm btn-danger"  onclick="app.revisarOrden('${o.getId()}', false)">Reject</button>` : ''}
              ${o.estado === EstadoPedido.EN_PROCESO && this.servicio.usuarioActual?.rol === RolUsuario.AGENTE_RECEPCION ? `
                <button class="btn btn-sm btn-primary" onclick="app.completarOrden('${o.getId()}')">Complete</button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ── WORKFLOW DIAGRAM ──
  _renderWorkflow() {
    const pedidos = this.servicio.getPedidos();
    const pedidoActivo = pedidos.find(p =>
      p.estado !== EstadoPedido.COMPLETADO && p.estado !== EstadoPedido.RECHAZADO
    ) || pedidos[pedidos.length - 1];

    const lanes = [
      {
        label: 'Shipping Office', icon: '📦',
        steps: [
          { text: 'Prepare Requisition', estados: [EstadoPedido.PENDIENTE] },
          { text: '→' },
          { diamond: 'RFQ?' },
          { text: '→' }
        ]
      },
      {
        label: 'Buyer Agent', icon: '🛒',
        steps: [
          { text: 'Prepare RFQ', estados: [EstadoPedido.PENDIENTE, EstadoPedido.EN_REVISION] },
          { text: '→' },
          { diamond: 'Review?' },
          { text: '→' },
          { text: 'Review Quote', estados: [EstadoPedido.COTIZACION_ENVIADA] },
          { text: '→' },
          { text: 'Create Order', estados: [EstadoPedido.COTIZACION_ACEPTADA] }
        ]
      },
      {
        label: 'Supervisor', icon: '👔',
        steps: [
          { text: 'Evaluate Request', estados: [EstadoPedido.EN_REVISION] },
          { text: '→' },
          { diamond: 'Approve?' }
        ]
      },
      {
        label: 'Seller', icon: '🏪',
        steps: [
          { text: 'Review Quotation', estados: [EstadoPedido.APROBADO, EstadoPedido.EN_COTIZACION] },
          { text: '→' },
          { diamond: 'Quote?' },
          { text: '→' },
          { text: 'Prepare Quote', estados: [EstadoPedido.EN_COTIZACION, EstadoPedido.COTIZACION_ENVIADA] },
          { text: '→' },
          { text: 'Review Order', estados: [EstadoPedido.ORDEN_PREPARADA] },
          { text: '→' },
          { text: 'Fulfill Order', estados: [EstadoPedido.EN_PROCESO] }
        ]
      },
      {
        label: 'Receive Agent', icon: '📬',
        steps: [
          { text: 'Prepare Invoice', estados: [EstadoPedido.EN_PROCESO] },
          { text: '→' },
          { text: 'Receive Payment', estados: [EstadoPedido.EN_PROCESO] },
          { text: '→' },
          { text: 'Receive Product', estados: [EstadoPedido.COMPLETADO] }
        ]
      }
    ];

    document.getElementById('flowDiagram').innerHTML = lanes.map(lane => `
      <div class="flow-lane">
        <div class="flow-lane-label">
          <span class="flow-lane-icon">${lane.icon}</span>
          ${lane.label}
        </div>
        <div class="flow-steps">
          ${lane.steps.map(step => {
            if (step.text === '→') return `<span class="flow-arrow">→</span>`;
            if (step.diamond) return `<div class="flow-diamond"><span>${step.diamond}</span></div>`;
            const isActive = pedidoActivo && step.estados?.includes(pedidoActivo.estado);
            const isDone = pedidoActivo && step.estados?.some(e => {
              const orden = [EstadoPedido.PENDIENTE, EstadoPedido.EN_REVISION, EstadoPedido.APROBADO, EstadoPedido.EN_COTIZACION, EstadoPedido.COTIZACION_ENVIADA, EstadoPedido.COTIZACION_ACEPTADA, EstadoPedido.ORDEN_PREPARADA, EstadoPedido.EN_PROCESO, EstadoPedido.COMPLETADO];
              return orden.indexOf(pedidoActivo.estado) > orden.indexOf(e);
            });
            return `<div class="flow-step ${isActive ? 'active' : isDone ? 'done' : 'pending'}">${step.text}</div>`;
          }).join('')}
        </div>
      </div>`).join('');
  }

  // ── CODE EDITOR ──
  _initEditor() {
    const archivos = {
      'src/models/index.ts':   this._getModelSource(),
      'src/services/index.ts': this._getServiceSource(),
      'src/controllers/index.ts': this._getControllerSource(),
      'public/css/styles.css': '/* Open styles.css to view styles */',
      'index.html':            '<!-- Open index.html to view markup -->',
      'tsconfig.json':         JSON.stringify({"compilerOptions":{"target":"ES2020","module":"ES2020","strict":true,"outDir":"./public/js"}}, null, 2),
      'package.json':          JSON.stringify({"name":"store-procurement-system","version":"1.0.0","scripts":{"build":"tsc","watch":"tsc --watch"}}, null, 2)
    };

    this._archivosEditor = archivos;
    this._archivoActivo  = 'src/models/index.ts';

    const tree = document.getElementById('fileTree');
    const carpetas = {
      'src/models':      [],
      'src/services':    [],
      'src/controllers': [],
      'public/css':      [],
      'root':            []
    };

    Object.keys(archivos).forEach(ruta => {
      if (ruta.startsWith('src/models/')) carpetas['src/models'].push(ruta);
      else if (ruta.startsWith('src/services/')) carpetas['src/services'].push(ruta);
      else if (ruta.startsWith('src/controllers/')) carpetas['src/controllers'].push(ruta);
      else if (ruta.startsWith('public/')) carpetas['public/css'].push(ruta);
      else carpetas['root'].push(ruta);
    });

    const iconMap = { '.ts': '🟦', '.css': '🎨', '.html': '🌐', '.json': '⚙️' };
    const getIcon = r => iconMap[Object.keys(iconMap).find(k => r.endsWith(k))] || '📄';

    tree.innerHTML = Object.entries(carpetas).map(([carpeta, rutas]) => {
      if (!rutas.length) return '';
      const label = carpeta === 'root' ? '/' : carpeta;
      return `
        <div class="file-folder">
          <div class="file-folder-name">📁 ${label}</div>
          ${rutas.map(r => `
            <div class="file-item ${r === this._archivoActivo ? 'active' : ''}" data-file="${r}">
              <span class="file-icon">${getIcon(r)}</span>${r.split('/').pop()}
            </div>`).join('')}
        </div>`;
    }).join('');

    tree.querySelectorAll('.file-item').forEach(item => {
      item.onclick = () => {
        this._archivoActivo = item.dataset.file;
        tree.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this._cargarArchivoEditor(item.dataset.file);
      };
    });

    // Tabs
    const tabs = document.getElementById('editorTabs');
    ['src/models/index.ts', 'src/services/index.ts', 'src/controllers/index.ts'].forEach((archivo, i) => {
      const tab = document.createElement('button');
      tab.className = 'editor-tab' + (i === 0 ? ' active' : '');
      tab.textContent = archivo.split('/').pop();
      tab.dataset.file = archivo;
      tab.onclick = () => {
        tabs.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._archivoActivo = archivo;
        this._cargarArchivoEditor(archivo);
      };
      tabs.appendChild(tab);
    });

    this._cargarArchivoEditor(this._archivoActivo);

    // Buttons
    document.getElementById('copyCodeBtn').onclick = () => {
      navigator.clipboard.writeText(document.getElementById('codeEditor').value);
      this.mostrarToast('Code copied!', 'info');
    };

    document.getElementById('formatCodeBtn').onclick = () => {
      this.mostrarToast('Format: Use Prettier in VS Code (Alt+Shift+F)', 'info');
    };

    // Line numbers & cursor
    const editor = document.getElementById('codeEditor');
    editor.addEventListener('input', () => this._actualizarNumeroLineas());
    editor.addEventListener('keyup', (e) => this._actualizarCursor(e));
    editor.addEventListener('click', (e) => this._actualizarCursor(e));
    editor.addEventListener('scroll', () => {
      document.getElementById('lineNumbers').scrollTop = editor.scrollTop;
    });
  }

  _cargarArchivoEditor(ruta) {
    const contenido = this._archivosEditor[ruta] || '// File content not available';
    document.getElementById('codeEditor').value = contenido;
    document.getElementById('editorFileName').textContent = ruta;
    this._actualizarNumeroLineas();
  }

  _actualizarNumeroLineas() {
    const lineas = document.getElementById('codeEditor').value.split('\n').length;
    document.getElementById('lineNumbers').textContent =
      Array.from({length: lineas}, (_, i) => i + 1).join('\n');
  }

  _actualizarCursor(e) {
    const editor = e.target;
    const texto  = editor.value.substring(0, editor.selectionStart);
    const linea  = texto.split('\n').length;
    const col    = texto.split('\n').pop().length + 1;
    document.getElementById('cursorPos').textContent = `Ln ${linea}, Col ${col}`;
  }

  // ── MODAL ACTIONS (exposed to window.app) ──
  verDetallePedido(id) {
    const pedido = this.servicio.buscarPedido(id);
    if (!pedido) return;
    this._abrirModal(
      `Requisition Details — ${pedido.titulo}`,
      `<div>
        <div class="detail-group"><div class="detail-label">Status</div>
          <span class="badge ${this._badgeClass(pedido.estado)}">${this._estadoLabel(pedido.estado)}</span></div>
        <div class="detail-group"><div class="detail-label">Description</div><div class="detail-value">${pedido.descripcion}</div></div>
        <div class="detail-group"><div class="detail-label">Products</div>
          ${pedido.productos.map(p => `<div class="list-item" style="margin-bottom:6px">
            <div><strong>${p.nombre}</strong><br><small style="color:var(--text-muted)">${p.categoria}</small></div>
            <div style="text-align:right"><strong>$${(p.precio*p.cantidad).toFixed(2)}</strong><br><small>$${p.precio} × ${p.cantidad}</small></div>
          </div>`).join('')}
          <div style="text-align:right;margin-top:8px;font-weight:700">Total: $${pedido.calcularTotal().toFixed(2)}</div>
        </div>
        <div class="detail-group"><div class="detail-label">History</div>
          ${pedido.historial.slice(-5).reverse().map(h => `
            <div class="history-item">
              <div class="history-dot"></div>
              <div><strong>${this._estadoLabel(h.estado)}</strong><br>
                <small style="color:var(--text-muted)">${h.comentario}</small><br>
                <small style="color:var(--text-muted)">${new Date(h.fecha).toLocaleString()}</small>
              </div>
            </div>`).join('')}
        </div>
      </div>`,
      [{ texto: 'Close', clase: 'btn btn-ghost', accion: () => this.cerrarModal() }]
    );
  }

  prepararRFQ(id) {
    this._abrirModal(
      'Prepare RFQ',
      `<div>
        <div class="detail-group"><div class="detail-label">Does this require supervisor review?</div></div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer">
          <input type="checkbox" id="chkRevision" /> Needs supervisor approval
        </label>
      </div>`,
      [
        { texto: 'Cancel', clase: 'btn btn-ghost', accion: () => this.cerrarModal() },
        { texto: 'Send RFQ', clase: 'btn btn-primary', accion: () => {
          const necesita = document.getElementById('chkRevision').checked;
          this.servicio.prepararRFQ(id, necesita);
          this.cerrarModal();
          this.mostrarToast('RFQ prepared!', 'success');
          this._renderRequisiciones();
        }}
      ]
    );
  }

  aprobarPedido(id, aprobado) {
    this._abrirModal(
      aprobado ? 'Approve Requisition' : 'Reject Requisition',
      `<div>
        <div class="detail-group">
          <div class="detail-label">Comment (optional)</div>
          <textarea id="comentarioAprobacion" class="input" rows="3" placeholder="Add a note..."></textarea>
        </div>
      </div>`,
      [
        { texto: 'Cancel', clase: 'btn btn-ghost', accion: () => this.cerrarModal() },
        {
          texto: aprobado ? '✓ Approve' : '✗ Reject',
          clase: aprobado ? 'btn btn-success' : 'btn btn-danger',
          accion: () => {
            const comentario = document.getElementById('comentarioAprobacion').value;
            this.servicio.aprobarSolicitud(id, aprobado, comentario);
            this.cerrarModal();
            this.mostrarToast(aprobado ? 'Requisition approved!' : 'Requisition rejected', aprobado ? 'success' : 'error');
            this._renderRequisiciones();
          }
        }
      ]
    );
  }

  revisarCotizacion(id, aceptada) {
    const cotizacion = this.servicio.buscarCotizacion(id);
    this._abrirModal(
      aceptada ? 'Accept Quote' : 'Reject Quote',
      `<div>
        <div class="detail-group"><div class="detail-label">Quote Price</div><div class="detail-value" style="font-size:22px;font-weight:700">$${cotizacion?.precio.toFixed(2)}</div></div>
        ${!aceptada ? `<div class="detail-group"><div class="detail-label">Rejection Reason</div>
          <textarea id="motivoRechazo" class="input" rows="2" placeholder="Reason for rejection..."></textarea></div>` : ''}
      </div>`,
      [
        { texto: 'Cancel', clase: 'btn btn-ghost', accion: () => this.cerrarModal() },
        {
          texto: aceptada ? '✓ Accept Quote' : '✗ Reject Quote',
          clase: aceptada ? 'btn btn-success' : 'btn btn-danger',
          accion: () => {
            const motivo = !aceptada ? (document.getElementById('motivoRechazo')?.value || '') : '';
            this.servicio.revisarCotizacion(id, aceptada, motivo);
            this.cerrarModal();
            this.mostrarToast(aceptada ? 'Quote accepted!' : 'Quote rejected', aceptada ? 'success' : 'error');
            this._renderCotizaciones();
          }
        }
      ]
    );
  }

  revisarOrden(id, aceptada) {
    this._abrirModal(
      aceptada ? 'Accept Order' : 'Reject Order',
      `<div>
        ${!aceptada ? `<div class="form-group"><label>Rejection Reason</label>
          <textarea id="motivoRechazoOrden" class="input" rows="2" placeholder="Reason..."></textarea></div>` : 
          '<p style="color:var(--text-secondary)">Confirm order acceptance and begin fulfillment?</p>'}
      </div>`,
      [
        { texto: 'Cancel', clase: 'btn btn-ghost', accion: () => this.cerrarModal() },
        {
          texto: aceptada ? 'Accept & Fulfill' : 'Reject Order',
          clase: aceptada ? 'btn btn-success' : 'btn btn-danger',
          accion: () => {
            const motivo = !aceptada ? (document.getElementById('motivoRechazoOrden')?.value || '') : '';
            this.servicio.revisarOrden(id, aceptada, motivo);
            this.cerrarModal();
            this.mostrarToast(aceptada ? 'Order accepted!' : 'Order rejected', aceptada ? 'success' : 'error');
            this._renderOrdenes();
          }
        }
      ]
    );
  }

  completarOrden(id) {
    this._abrirModal(
      'Complete Order',
      `<div>
        <div class="form-group"><label>Delivery Note</label>
          <textarea id="notaEntregaFinal" class="input" rows="3" placeholder="e.g. Delivered to reception — signed by..."></textarea></div>
      </div>`,
      [
        { texto: 'Cancel', clase: 'btn btn-ghost', accion: () => this.cerrarModal() },
        {
          texto: '✓ Mark Delivered',
          clase: 'btn btn-primary',
          accion: () => {
            const nota = document.getElementById('notaEntregaFinal').value;
            this.servicio.completarOrden(id, nota);
            this.cerrarModal();
            this.mostrarToast('Order completed! 🎉', 'success');
            this._renderOrdenes();
          }
        }
      ]
    );
  }

  // ── MODAL HELPERS ──
  _abrirModal(titulo, cuerpo, botones) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalBody').innerHTML = cuerpo;
    document.getElementById('modalFooter').innerHTML = '';
    botones.forEach(b => {
      const btn = document.createElement('button');
      btn.className = b.clase;
      btn.textContent = b.texto;
      btn.onclick = b.accion;
      document.getElementById('modalFooter').appendChild(btn);
    });
    document.getElementById('modalOverlay').style.display = 'flex';
  }

  cerrarModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  }

  // ── TOAST ──
  mostrarToast(mensaje, tipo = 'info') {
    const contenedor = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const iconos = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${iconos[tipo] || 'ℹ️'}</span><span>${mensaje}</span>`;
    contenedor.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // ── BADGE & LABEL HELPERS ──
  _badgeClass(estado) {
    const mapa = {
      [EstadoPedido.PENDIENTE]:           'badge-pending',
      [EstadoPedido.EN_REVISION]:         'badge-review',
      [EstadoPedido.APROBADO]:            'badge-approved',
      [EstadoPedido.RECHAZADO]:           'badge-rejected',
      [EstadoPedido.EN_COTIZACION]:       'badge-quote',
      [EstadoPedido.COTIZACION_ENVIADA]:  'badge-quote',
      [EstadoPedido.COTIZACION_ACEPTADA]: 'badge-approved',
      [EstadoPedido.ORDEN_PREPARADA]:     'badge-review',
      [EstadoPedido.EN_PROCESO]:          'badge-review',
      [EstadoPedido.COMPLETADO]:          'badge-complete',
      [EstadoPedido.CANCELADO]:           'badge-rejected'
    };
    return mapa[estado] || 'badge-pending';
  }

  _estadoLabel(estado) {
    const mapa = {
      [EstadoPedido.PENDIENTE]:           'Pending',
      [EstadoPedido.EN_REVISION]:         'Under Review',
      [EstadoPedido.APROBADO]:            'Approved',
      [EstadoPedido.RECHAZADO]:           'Rejected',
      [EstadoPedido.EN_COTIZACION]:       'Quoting',
      [EstadoPedido.COTIZACION_ENVIADA]:  'Quote Sent',
      [EstadoPedido.COTIZACION_ACEPTADA]: 'Quote Accepted',
      [EstadoPedido.ORDEN_PREPARADA]:     'Order Prepared',
      [EstadoPedido.EN_PROCESO]:          'In Process',
      [EstadoPedido.COMPLETADO]:          'Completed',
      [EstadoPedido.CANCELADO]:           'Cancelled'
    };
    return mapa[estado] || estado;
  }

  // ── INLINE SOURCE CODE FOR EDITOR VIEW ──
  _getModelSource() {
    return `// ============================================================
// MODELS: Enums, Interfaces, and Base Classes
// Store Procurement & Order Management System
// ============================================================

export enum EstadoPedido {
  PENDIENTE          = "PENDING",
  EN_REVISION        = "UNDER_REVIEW",
  APROBADO           = "APPROVED",
  RECHAZADO          = "REJECTED",
  EN_COTIZACION      = "QUOTING",
  COTIZACION_ENVIADA = "QUOTE_SENT",
  COTIZACION_ACEPTADA= "QUOTE_ACCEPTED",
  ORDEN_PREPARADA    = "ORDER_PREPARED",
  EN_PROCESO         = "IN_PROCESS",
  COMPLETADO         = "COMPLETED",
  CANCELADO          = "CANCELLED"
}

export enum RolUsuario {
  OFICINA_ENVIOS   = "SHIPPING_OFFICE",
  AGENTE_COMPRADOR = "BUYER_AGENT",
  SUPERVISOR       = "SUPERVISOR",
  VENDEDOR         = "SELLER",
  AGENTE_RECEPCION = "RECEIVE_AGENT"
}

// Base Class — all entities extend this
export abstract class Entidad {
  protected id: string;
  protected fechaCreacion: Date;
  protected fechaActualizacion: Date;

  constructor(id?: string) {
    this.id = id || this.generarId();
    this.fechaCreacion = new Date();
    this.fechaActualizacion = new Date();
  }

  private generarId(): string {
    return \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
  }

  public getId(): string { return this.id; }
  protected actualizarFecha(): void { this.fechaActualizacion = new Date(); }
  abstract toJSON(): object;
}

export class Producto extends Entidad { /* ... */ }
export class Usuario  extends Entidad { /* ... */ }
export class Pedido   extends Entidad { /* ... */ }
export class Cotizacion extends Entidad { /* ... */ }
export class Orden    extends Entidad { /* ... */ }`;
  }

  _getServiceSource() {
    return `// ============================================================
// SERVICES: Business Logic — Procurement Workflow
// Follows diagram: Shipping → Buyer → Supervisor → Seller → Receive
// ============================================================

export class ServicioProcuramiento {
  private listaPedidos:      Pedido[]      = [];
  private listaCotizaciones: Cotizacion[]  = [];
  private listaOrdenes:      Orden[]       = [];
  private usuarioActual:     Usuario | null = null;

  // STEP 1: Shipping Office creates requisition
  public crearRequisicion(titulo: string, descripcion: string, productos: Producto[]): Pedido { /* ... */ }

  // STEP 2: Buyer Agent prepares RFQ
  public prepararRFQ(idPedido: string, necesitaRevision: boolean): Pedido | null { /* ... */ }

  // STEP 3: Supervisor approves or rejects
  public aprobarSolicitud(idPedido: string, aprobado: boolean, comentario: string): Pedido | null { /* ... */ }

  // STEP 4: Seller creates quote
  public crearCotizacion(idPedido: string, precio: number, descripcion: string, decideCotizar: boolean): Cotizacion | null { /* ... */ }

  // STEP 5: Buyer reviews quote
  public revisarCotizacion(idCotizacion: string, aceptada: boolean, notas?: string): Cotizacion | null { /* ... */ }

  // STEP 6: Create order from accepted quote
  public crearOrden(idPedido: string, idCotizacion: string): Orden | null { /* ... */ }

  // STEP 7: Seller reviews and accepts/rejects order
  public revisarOrden(idOrden: string, aceptada: boolean, notas?: string): Orden | null { /* ... */ }

  // STEP 8: Receive agent completes delivery
  public completarOrden(idOrden: string, notaEntrega: string): Orden | null { /* ... */ }

  // Statistics
  public getEstadisticas(): object { /* returns counts + totals */ }
}`;
  }

  _getControllerSource() {
    return `// ============================================================
// CONTROLLERS: View logic & DOM interaction
// ============================================================

class ControladorVistas {
  private servicio: ServicioProcuramiento;
  private vistaActual: string = 'dashboard';
  private listaProductosForm: Producto[] = [];

  constructor(servicio: ServicioProcuramiento) {
    this.servicio = servicio;
    this._initEventos();
    this._initEditor();
    this.renderizarVista('dashboard');
  }

  // Navigation
  renderizarVista(nombreVista: string): void { /* switch views */ }

  // Dashboard
  private _renderDashboard(): void { /* stats + recent items */ }

  // Requisitions
  private _renderRequisiciones(): void { /* table + form */ }

  // Quotes
  private _renderCotizaciones(): void { /* table + form */ }

  // Orders
  private _renderOrdenes(): void { /* table + form */ }

  // Workflow diagram
  private _renderWorkflow(): void { /* lane-based diagram */ }

  // Code Editor
  private _initEditor(): void { /* file tree + tabs + textarea */ }

  // Modals
  verDetallePedido(id: string): void { /* open detail modal */ }
  prepararRFQ(id: string): void { /* RFQ modal */ }
  aprobarPedido(id: string, aprobado: boolean): void { /* approve/reject modal */ }
  revisarCotizacion(id: string, aceptada: boolean): void { /* quote review modal */ }
  revisarOrden(id: string, aceptada: boolean): void { /* order review modal */ }
  completarOrden(id: string): void { /* complete delivery modal */ }
}`;
  }
}

// ══════════════════════════════════
// BOOTSTRAP: Initialize application
// ══════════════════════════════════
const servicioPrincipal = new ServicioProcuramiento();

const usuarioInicial = new Usuario({
  nombre: 'Shipping Officer',
  email:  'shipping@store.com',
  rol:    RolUsuario.OFICINA_ENVIOS
});
servicioPrincipal.setUsuarioActual(usuarioInicial);

// Expose controller to global for inline onclick handlers
const app = new ControladorVistas(servicioPrincipal);
window.app = app;
