// ============================================================
// SERVICES: Business Logic for Procurement Workflow
// Follows the flowchart: Shipping → Buyer → Supervisor → Seller → Receive
// ============================================================

import {
  Pedido, Cotizacion, Orden, Producto, Usuario,
  EstadoPedido, RolUsuario
} from '../models/index.js';

// ============================================================
// CLASS: ServicioAlmacenamiento (Storage Service)
// ============================================================
export class ServicioAlmacenamiento {
  private static readonly CLAVE_PEDIDOS = 'store_pedidos';
  private static readonly CLAVE_COTIZACIONES = 'store_cotizaciones';
  private static readonly CLAVE_ORDENES = 'store_ordenes';
  private static readonly CLAVE_USUARIOS = 'store_usuarios';

  public static guardarPedidos(pedidos: Pedido[]): void {
    localStorage.setItem(this.CLAVE_PEDIDOS, JSON.stringify(pedidos.map(p => p.toJSON())));
  }

  public static cargarPedidos(): object[] {
    const datos = localStorage.getItem(this.CLAVE_PEDIDOS);
    return datos ? JSON.parse(datos) : [];
  }

  public static guardarCotizaciones(cotizaciones: Cotizacion[]): void {
    localStorage.setItem(this.CLAVE_COTIZACIONES, JSON.stringify(cotizaciones.map(c => c.toJSON())));
  }

  public static cargarCotizaciones(): object[] {
    const datos = localStorage.getItem(this.CLAVE_COTIZACIONES);
    return datos ? JSON.parse(datos) : [];
  }

  public static guardarOrdenes(ordenes: Orden[]): void {
    localStorage.setItem(this.CLAVE_ORDENES, JSON.stringify(ordenes.map(o => o.toJSON())));
  }

  public static cargarOrdenes(): object[] {
    const datos = localStorage.getItem(this.CLAVE_ORDENES);
    return datos ? JSON.parse(datos) : [];
  }

  public static limpiarTodo(): void {
    localStorage.removeItem(this.CLAVE_PEDIDOS);
    localStorage.removeItem(this.CLAVE_COTIZACIONES);
    localStorage.removeItem(this.CLAVE_ORDENES);
  }
}

// ============================================================
// CLASS: ServicioProcuramiento (Main Procurement Service)
// ============================================================
export class ServicioProcuramiento {
  private listaPedidos: Pedido[] = [];
  private listaCotizaciones: Cotizacion[] = [];
  private listaOrdenes: Orden[] = [];
  private usuarioActual: Usuario | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.cargarDatos();
    this.inicializarDatosDemostracion();
  }

  // ---- Event System ----
  public on(evento: string, callback: Function): void {
    if (!this.callbacks.has(evento)) this.callbacks.set(evento, []);
    this.callbacks.get(evento)!.push(callback);
  }

  private emitir(evento: string, datos?: any): void {
    this.callbacks.get(evento)?.forEach(cb => cb(datos));
  }

  // ---- User Management ----
  public setUsuarioActual(usuario: Usuario): void {
    this.usuarioActual = usuario;
    this.emitir('usuario:cambio', usuario);
  }

  public getUsuarioActual(): Usuario | null { return this.usuarioActual; }

  // ---- Data Loading ----
  private cargarDatos(): void {
    // Restore pedidos
    const datosPedidos = ServicioAlmacenamiento.cargarPedidos() as any[];
    this.listaPedidos = datosPedidos.map(d => {
      const p = new Pedido({ titulo: d.titulo, descripcion: d.descripcion, idCreador: d.idCreador, rolCreador: d.rolCreador, id: d.id });
      p.estado = d.estado;
      p.necesitaRevision = d.necesitaRevision;
      p.aprobado = d.aprobado;
      p.historial = d.historial || [];
      p.productos = (d.productos || []).map((pr: any) => new Producto(pr));
      return p;
    });

    // Restore cotizaciones
    const datosCot = ServicioAlmacenamiento.cargarCotizaciones() as any[];
    this.listaCotizaciones = datosCot.map(d => {
      const c = new Cotizacion({ idPedido: d.idPedido, precio: d.precio, descripcion: d.descripcion, id: d.id, notas: d.notas });
      c.aceptada = d.aceptada;
      c.revisada = d.revisada;
      return c;
    });

    // Restore ordenes
    const datosOrd = ServicioAlmacenamiento.cargarOrdenes() as any[];
    this.listaOrdenes = datosOrd.map(d => {
      const o = new Orden({ idPedido: d.idPedido, idCotizacion: d.idCotizacion, total: d.total, id: d.id });
      o.estado = d.estado;
      o.facturaGenerada = d.facturaGenerada;
      o.pagoRecibido = d.pagoRecibido;
      o.productoEntregado = d.productoEntregado;
      o.notaEntrega = d.notaEntrega;
      return o;
    });
  }

  private guardarTodo(): void {
    ServicioAlmacenamiento.guardarPedidos(this.listaPedidos);
    ServicioAlmacenamiento.guardarCotizaciones(this.listaCotizaciones);
    ServicioAlmacenamiento.guardarOrdenes(this.listaOrdenes);
  }

  private inicializarDatosDemostracion(): void {
    if (this.listaPedidos.length === 0) {
      const p1 = new Pedido({
        titulo: "Office Supplies Requisition",
        descripcion: "Monthly office supplies including paper, pens, and folders",
        idCreador: "user-1",
        rolCreador: RolUsuario.OFICINA_ENVIOS
      });
      p1.agregarProducto(new Producto({ nombre: "A4 Paper (500 sheets)", precio: 12.50, cantidad: 10, categoria: "Office" }));
      p1.agregarProducto(new Producto({ nombre: "Ballpoint Pens (Box)", precio: 5.00, cantidad: 5, categoria: "Office" }));
      p1.necesitaRevision = true;
      p1.cambiarEstado(EstadoPedido.EN_REVISION, "Sent for buyer review");

      const p2 = new Pedido({
        titulo: "IT Equipment Request",
        descripcion: "Replacement keyboards and mice for accounting department",
        idCreador: "user-1",
        rolCreador: RolUsuario.OFICINA_ENVIOS
      });
      p2.agregarProducto(new Producto({ nombre: "Mechanical Keyboard", precio: 89.99, cantidad: 3, categoria: "IT" }));
      p2.agregarProducto(new Producto({ nombre: "Wireless Mouse", precio: 35.00, cantidad: 3, categoria: "IT" }));
      p2.cambiarEstado(EstadoPedido.APROBADO, "Approved by supervisor");
      p2.aprobado = true;

      this.listaPedidos.push(p1, p2);
      this.guardarTodo();
    }
  }

  // ---- STEP 1: Shipping Office - Create Requisition ----
  public crearRequisicion(titulo: string, descripcion: string, productos: Producto[]): Pedido {
    const pedido = new Pedido({
      titulo, descripcion,
      idCreador: this.usuarioActual?.getId() || "anonymous",
      rolCreador: RolUsuario.OFICINA_ENVIOS
    });
    productos.forEach(p => pedido.agregarProducto(p));
    pedido.cambiarEstado(EstadoPedido.PENDIENTE, "Requisition prepared by shipping office");
    this.listaPedidos.push(pedido);
    this.guardarTodo();
    this.emitir('pedido:creado', pedido);
    return pedido;
  }

  // ---- STEP 2: Buyer Agent - Prepare RFQ ----
  public prepararRFQ(idPedido: string, necesitaRevision: boolean): Pedido | null {
    const pedido = this.buscarPedido(idPedido);
    if (!pedido) return null;
    pedido.necesitaRevision = necesitaRevision;
    if (necesitaRevision) {
      pedido.cambiarEstado(EstadoPedido.EN_REVISION, "RFQ sent for supervisor review");
    } else {
      pedido.cambiarEstado(EstadoPedido.EN_COTIZACION, "RFQ prepared - sent directly to seller");
    }
    this.guardarTodo();
    this.emitir('pedido:actualizado', pedido);
    return pedido;
  }

  // ---- STEP 3: Supervisor - Approve/Reject ----
  public aprobarSolicitud(idPedido: string, aprobado: boolean, comentario: string): Pedido | null {
    const pedido = this.buscarPedido(idPedido);
    if (!pedido) return null;
    pedido.aprobado = aprobado;
    if (aprobado) {
      pedido.cambiarEstado(EstadoPedido.APROBADO, comentario || "Approved by supervisor");
    } else {
      pedido.cambiarEstado(EstadoPedido.RECHAZADO, comentario || "Rejected by supervisor");
    }
    this.guardarTodo();
    this.emitir('pedido:actualizado', pedido);
    return pedido;
  }

  // ---- STEP 4: Seller - Create Quote ----
  public crearCotizacion(idPedido: string, precio: number, descripcion: string, decideCotizar: boolean): Cotizacion | null {
    if (!decideCotizar) {
      const pedido = this.buscarPedido(idPedido);
      if (pedido) pedido.cambiarEstado(EstadoPedido.RECHAZADO, "Seller declined to quote");
      this.guardarTodo();
      return null;
    }
    const cotizacion = new Cotizacion({ idPedido, precio, descripcion });
    this.listaCotizaciones.push(cotizacion);
    const pedido = this.buscarPedido(idPedido);
    if (pedido) pedido.cambiarEstado(EstadoPedido.COTIZACION_ENVIADA, "Quote prepared and sent");
    this.guardarTodo();
    this.emitir('cotizacion:creada', cotizacion);
    return cotizacion;
  }

  // ---- STEP 5: Buyer - Review Quote ----
  public revisarCotizacion(idCotizacion: string, aceptada: boolean, notas: string = ""): Cotizacion | null {
    const cotizacion = this.buscarCotizacion(idCotizacion);
    if (!cotizacion) return null;
    if (aceptada) {
      cotizacion.aceptar();
      const pedido = this.buscarPedido(cotizacion.idPedido);
      if (pedido) pedido.cambiarEstado(EstadoPedido.COTIZACION_ACEPTADA, "Quote accepted by buyer");
    } else {
      cotizacion.rechazar(notas);
      const pedido = this.buscarPedido(cotizacion.idPedido);
      if (pedido) pedido.cambiarEstado(EstadoPedido.EN_COTIZACION, "Quote rejected - new quote requested");
    }
    this.guardarTodo();
    this.emitir('cotizacion:actualizada', cotizacion);
    return cotizacion;
  }

  // ---- STEP 6: Create Order ----
  public crearOrden(idPedido: string, idCotizacion: string): Orden | null {
    const pedido = this.buscarPedido(idPedido);
    const cotizacion = this.buscarCotizacion(idCotizacion);
    if (!pedido || !cotizacion) return null;
    const orden = new Orden({ idPedido, idCotizacion, total: cotizacion.precio });
    this.listaOrdenes.push(orden);
    pedido.cambiarEstado(EstadoPedido.ORDEN_PREPARADA, "Order preparation complete");
    this.guardarTodo();
    this.emitir('orden:creada', orden);
    return orden;
  }

  // ---- STEP 7: Seller - Review Order ----
  public revisarOrden(idOrden: string, aceptada: boolean, notas: string = ""): Orden | null {
    const orden = this.buscarOrden(idOrden);
    if (!orden) return null;
    const pedido = this.buscarPedido(orden.idPedido);
    if (aceptada) {
      orden.estado = EstadoPedido.EN_PROCESO;
      if (pedido) pedido.cambiarEstado(EstadoPedido.EN_PROCESO, "Order accepted by seller");
      this.emitir('orden:actualizada', orden);
    } else {
      orden.estado = EstadoPedido.RECHAZADO as any;
      if (pedido) pedido.cambiarEstado(EstadoPedido.RECHAZADO, `Order rejected: ${notas}`);
    }
    this.guardarTodo();
    return orden;
  }

  // ---- STEP 8: Complete Order ----
  public completarOrden(idOrden: string, notaEntrega: string): Orden | null {
    const orden = this.buscarOrden(idOrden);
    if (!orden) return null;
    orden.generarFactura();
    orden.registrarPago();
    orden.completarEntrega(notaEntrega);
    const pedido = this.buscarPedido(orden.idPedido);
    if (pedido) pedido.cambiarEstado(EstadoPedido.COMPLETADO, "Order fulfilled and product received");
    this.guardarTodo();
    this.emitir('orden:completada', orden);
    return orden;
  }

  // ---- Getters ----
  public getPedidos(): Pedido[] { return this.listaPedidos; }
  public getCotizaciones(): Cotizacion[] { return this.listaCotizaciones; }
  public getOrdenes(): Orden[] { return this.listaOrdenes; }

  public buscarPedido(id: string): Pedido | undefined {
    return this.listaPedidos.find(p => p.getId() === id);
  }
  public buscarCotizacion(id: string): Cotizacion | undefined {
    return this.listaCotizaciones.find(c => c.getId() === id);
  }
  public buscarOrden(id: string): Orden | undefined {
    return this.listaOrdenes.find(o => o.getId() === id);
  }

  public getCotizacionesPorPedido(idPedido: string): Cotizacion[] {
    return this.listaCotizaciones.filter(c => c.idPedido === idPedido);
  }

  public getOrdenPorPedido(idPedido: string): Orden | undefined {
    return this.listaOrdenes.find(o => o.idPedido === idPedido);
  }

  public limpiarDatos(): void {
    this.listaPedidos = [];
    this.listaCotizaciones = [];
    this.listaOrdenes = [];
    ServicioAlmacenamiento.limpiarTodo();
    this.emitir('datos:limpiados');
  }

  // ---- Statistics ----
  public getEstadisticas(): object {
    return {
      totalPedidos: this.listaPedidos.length,
      pedidosPendientes: this.listaPedidos.filter(p => p.estado === EstadoPedido.PENDIENTE).length,
      pedidosAprobados: this.listaPedidos.filter(p => p.aprobado).length,
      pedidosCompletados: this.listaPedidos.filter(p => p.estado === EstadoPedido.COMPLETADO).length,
      totalCotizaciones: this.listaCotizaciones.length,
      cotizacionesAceptadas: this.listaCotizaciones.filter(c => c.aceptada).length,
      totalOrdenes: this.listaOrdenes.length,
      ordenesCompletadas: this.listaOrdenes.filter(o => o.estado === EstadoPedido.COMPLETADO).length,
      valorTotalOrdenes: this.listaOrdenes.reduce((sum, o) => sum + o.total, 0)
    };
  }
}
