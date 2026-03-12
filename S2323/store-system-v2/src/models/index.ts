// ============================================================
// MODELS: Enums, Interfaces, and Base Classes
// Store Procurement & Order Management System
// ============================================================

export enum EstadoPedido {
  PENDIENTE = "PENDING",
  EN_REVISION = "UNDER_REVIEW",
  APROBADO = "APPROVED",
  RECHAZADO = "REJECTED",
  EN_COTIZACION = "QUOTING",
  COTIZACION_ENVIADA = "QUOTE_SENT",
  COTIZACION_ACEPTADA = "QUOTE_ACCEPTED",
  ORDEN_PREPARADA = "ORDER_PREPARED",
  EN_PROCESO = "IN_PROCESS",
  COMPLETADO = "COMPLETED",
  CANCELADO = "CANCELLED"
}

export enum RolUsuario {
  OFICINA_ENVIOS = "SHIPPING_OFFICE",
  AGENTE_COMPRADOR = "BUYER_AGENT",
  SUPERVISOR = "SUPERVISOR",
  VENDEDOR = "SELLER",
  AGENTE_RECEPCION = "RECEIVE_AGENT"
}

export interface IProducto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  categoria: string;
}

export interface IUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export interface ICotizacion {
  id: string;
  idPedido: string;
  precio: number;
  descripcion: string;
  fechaCreacion: Date;
  aceptada: boolean;
}

export interface IOrden {
  id: string;
  idPedido: string;
  idCotizacion?: string;
  total: number;
  fechaCreacion: Date;
  estado: EstadoPedido;
}

// ============================================================
// BASE CLASS: Entidad
// ============================================================
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
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getId(): string { return this.id; }
  public getFechaCreacion(): Date { return this.fechaCreacion; }

  protected actualizarFecha(): void {
    this.fechaActualizacion = new Date();
  }

  abstract toJSON(): object;
}

// ============================================================
// CLASS: Producto
// ============================================================
export class Producto extends Entidad implements IProducto {
  public nombre: string;
  public descripcion: string;
  public precio: number;
  public cantidad: number;
  public categoria: string;

  constructor(data: Partial<IProducto> & { nombre: string }) {
    super(data.id);
    this.nombre = data.nombre;
    this.descripcion = data.descripcion || "";
    this.precio = data.precio || 0;
    this.cantidad = data.cantidad || 1;
    this.categoria = data.categoria || "General";
  }

  public actualizarPrecio(nuevoPrecio: number): void {
    this.precio = nuevoPrecio;
    this.actualizarFecha();
  }

  toJSON(): object {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      precio: this.precio,
      cantidad: this.cantidad,
      categoria: this.categoria,
      fechaCreacion: this.fechaCreacion
    };
  }
}

// ============================================================
// CLASS: Usuario
// ============================================================
export class Usuario extends Entidad implements IUsuario {
  public nombre: string;
  public email: string;
  public rol: RolUsuario;

  constructor(data: Omit<IUsuario, 'id'> & { id?: string }) {
    super(data.id);
    this.nombre = data.nombre;
    this.email = data.email;
    this.rol = data.rol;
  }

  public tienePermiso(accion: string): boolean {
    const permisos: Record<RolUsuario, string[]> = {
      [RolUsuario.OFICINA_ENVIOS]: ["crear_requisicion"],
      [RolUsuario.AGENTE_COMPRADOR]: ["crear_rfq", "revisar_cotizacion", "crear_orden"],
      [RolUsuario.SUPERVISOR]: ["aprobar_solicitud", "rechazar_solicitud"],
      [RolUsuario.VENDEDOR]: ["revisar_solicitud_cotizacion", "crear_cotizacion", "revisar_orden"],
      [RolUsuario.AGENTE_RECEPCION]: ["recibir_producto", "confirmar_entrega"]
    };
    return permisos[this.rol]?.includes(accion) || false;
  }

  toJSON(): object {
    return { id: this.id, nombre: this.nombre, email: this.email, rol: this.rol };
  }
}

// ============================================================
// CLASS: Pedido (Requisicion/RFQ)
// ============================================================
export class Pedido extends Entidad {
  public titulo: string;
  public descripcion: string;
  public estado: EstadoPedido;
  public productos: Producto[];
  public idCreador: string;
  public rolCreador: RolUsuario;
  public historial: Array<{ estado: EstadoPedido; fecha: Date; comentario: string }>;
  public necesitaRevision: boolean;
  public aprobado: boolean;

  constructor(data: {
    titulo: string;
    descripcion: string;
    idCreador: string;
    rolCreador: RolUsuario;
    productos?: Producto[];
    id?: string;
  }) {
    super(data.id);
    this.titulo = data.titulo;
    this.descripcion = data.descripcion;
    this.estado = EstadoPedido.PENDIENTE;
    this.productos = data.productos || [];
    this.idCreador = data.idCreador;
    this.rolCreador = data.rolCreador;
    this.historial = [];
    this.necesitaRevision = false;
    this.aprobado = false;
    this.agregarHistorial(EstadoPedido.PENDIENTE, "Request created");
  }

  public cambiarEstado(nuevoEstado: EstadoPedido, comentario: string = ""): void {
    this.estado = nuevoEstado;
    this.agregarHistorial(nuevoEstado, comentario);
    this.actualizarFecha();
  }

  private agregarHistorial(estado: EstadoPedido, comentario: string): void {
    this.historial.push({ estado, fecha: new Date(), comentario });
  }

  public agregarProducto(producto: Producto): void {
    this.productos.push(producto);
    this.actualizarFecha();
  }

  public calcularTotal(): number {
    return this.productos.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
  }

  toJSON(): object {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      estado: this.estado,
      productos: this.productos.map(p => p.toJSON()),
      idCreador: this.idCreador,
      necesitaRevision: this.necesitaRevision,
      aprobado: this.aprobado,
      historial: this.historial,
      fechaCreacion: this.fechaCreacion
    };
  }
}

// ============================================================
// CLASS: Cotizacion
// ============================================================
export class Cotizacion extends Entidad implements ICotizacion {
  public idPedido: string;
  public precio: number;
  public descripcion: string;
  public aceptada: boolean;
  public revisada: boolean;
  public notas: string;

  constructor(data: Omit<ICotizacion, 'id' | 'fechaCreacion' | 'aceptada'> & { id?: string; notas?: string }) {
    super(data.id);
    this.idPedido = data.idPedido;
    this.precio = data.precio;
    this.descripcion = data.descripcion;
    this.aceptada = false;
    this.revisada = false;
    this.notas = data.notas || "";
  }

  public aceptar(): void {
    this.aceptada = true;
    this.revisada = true;
    this.actualizarFecha();
  }

  public rechazar(motivo: string): void {
    this.aceptada = false;
    this.revisada = true;
    this.notas = motivo;
    this.actualizarFecha();
  }

  toJSON(): object {
    return {
      id: this.id,
      idPedido: this.idPedido,
      precio: this.precio,
      descripcion: this.descripcion,
      aceptada: this.aceptada,
      revisada: this.revisada,
      notas: this.notas,
      fechaCreacion: this.fechaCreacion
    };
  }
}

// ============================================================
// CLASS: Orden
// ============================================================
export class Orden extends Entidad implements IOrden {
  public idPedido: string;
  public idCotizacion?: string;
  public total: number;
  public estado: EstadoPedido;
  public facturaGenerada: boolean;
  public pagoRecibido: boolean;
  public productoEntregado: boolean;
  public notaEntrega: string;

  constructor(data: {
    idPedido: string;
    idCotizacion?: string;
    total: number;
    id?: string;
  }) {
    super(data.id);
    this.idPedido = data.idPedido;
    this.idCotizacion = data.idCotizacion;
    this.total = data.total;
    this.estado = EstadoPedido.ORDEN_PREPARADA;
    this.facturaGenerada = false;
    this.pagoRecibido = false;
    this.productoEntregado = false;
    this.notaEntrega = "";
  }

  public generarFactura(): void {
    this.facturaGenerada = true;
    this.estado = EstadoPedido.EN_PROCESO;
    this.actualizarFecha();
  }

  public registrarPago(): void {
    this.pagoRecibido = true;
    this.actualizarFecha();
  }

  public completarEntrega(nota: string): void {
    this.productoEntregado = true;
    this.notaEntrega = nota;
    this.estado = EstadoPedido.COMPLETADO;
    this.actualizarFecha();
  }

  toJSON(): object {
    return {
      id: this.id,
      idPedido: this.idPedido,
      idCotizacion: this.idCotizacion,
      total: this.total,
      estado: this.estado,
      facturaGenerada: this.facturaGenerada,
      pagoRecibido: this.pagoRecibido,
      productoEntregado: this.productoEntregado,
      notaEntrega: this.notaEntrega,
      fechaCreacion: this.fechaCreacion
    };
  }
}
