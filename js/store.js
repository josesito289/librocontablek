// store.js — estado central de la app, persistencia en localStorage (JSON)
// y reglas de negocio que conectan las 3 pestañas.

import { uid, parseFlexibleNumber, toast } from "./utils.js";
import { evalFormula, isFormula } from "./formula.js";

const STORAGE_KEY = "anchetas_contable_data_v1";
const SCHEMA_VERSION = 1;

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { lastModified: new Date().toISOString() },
    diario: [],   // Pestaña 1
    productos: [], // Pestaña 3 (catálogo maestro)
    costos: [],    // Pestaña 2 (componentes por referencia)
  };
}

class Store {
  constructor() {
    this.state = this._load();
    this._subs = [];
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return emptyState();
      return {
        schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
        meta: parsed.meta || { lastModified: new Date().toISOString() },
        diario: Array.isArray(parsed.diario) ? parsed.diario : [],
        productos: Array.isArray(parsed.productos) ? parsed.productos : [],
        costos: Array.isArray(parsed.costos) ? parsed.costos : [],
      };
    } catch (e) {
      console.error("No se pudo leer el almacenamiento local, se inicia vacío.", e);
      return emptyState();
    }
  }

  _persist() {
    this.state.meta.lastModified = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Error guardando en localStorage", e);
      toast("⚠️ No se pudo guardar localmente (memoria llena?)");
    }
    this._notify();
  }

  subscribe(fn) {
    this._subs.push(fn);
    return () => { this._subs = this._subs.filter((f) => f !== fn); };
  }

  _notify() {
    this._subs.forEach((fn) => { try { fn(this.state); } catch (e) { console.error(e); } });
  }

  // =========================================================
  // PRODUCTOS (Pestaña 3) — catálogo maestro
  // =========================================================
  listProductos() {
    return [...this.state.productos].sort((a, b) => a.producto.localeCompare(b.producto, "es"));
  }

  findProductoByName(nombre) {
    const n = (nombre || "").trim().toLowerCase();
    return this.state.productos.find((p) => p.producto.trim().toLowerCase() === n);
  }

  findProductoById(id) {
    return this.state.productos.find((p) => p.id === id);
  }

  addProducto({ producto, cantidad = 0, unidad = "", costoUnitario = 0 }) {
    const existing = this.findProductoByName(producto);
    if (existing) return existing;
    const p = {
      id: uid(),
      producto: (producto || "").trim(),
      cantidad: parseFlexibleNumber(cantidad),
      unidad: (unidad || "").trim(),
      costoUnitario: parseFlexibleNumber(costoUnitario),
    };
    this.state.productos.push(p);
    this._persist();
    return p;
  }

  updateProducto(id, patch) {
    const p = this.findProductoById(id);
    if (!p) return;
    if (patch.producto !== undefined) p.producto = String(patch.producto).trim();
    if (patch.cantidad !== undefined) p.cantidad = parseFlexibleNumber(patch.cantidad);
    if (patch.unidad !== undefined) p.unidad = String(patch.unidad).trim();
    if (patch.costoUnitario !== undefined) p.costoUnitario = parseFlexibleNumber(patch.costoUnitario);
    this._persist();
  }

  deleteProducto(id) {
    this.state.productos = this.state.productos.filter((p) => p.id !== id);
    this._persist();
  }

  importProductosCSV(rows, pick) {
    let created = 0, updated = 0;
    rows.forEach((r) => {
      const nombre = pick(r, "Producto");
      if (!nombre) return;
      const cantidad = parseFlexibleNumber(pick(r, "Cantidad"));
      const unidad = pick(r, "Unidad de medida", "Unidad") || "";
      const costoUnitario = parseFlexibleNumber(pick(r, "Costo Unitario", "Costo unitario"));
      const existing = this.findProductoByName(nombre);
      if (existing) {
        existing.cantidad = cantidad;
        existing.unidad = unidad;
        existing.costoUnitario = costoUnitario;
        updated++;
      } else {
        this.state.productos.push({ id: uid(), producto: nombre.trim(), cantidad, unidad, costoUnitario });
        created++;
      }
    });
    this._persist();
    return { created, updated };
  }

  // =========================================================
  // DIARIO (Pestaña 1)
  // =========================================================
  listDiario() {
    // Más reciente primero: por fecha desc y, si empatan, por creación desc.
    return [...this.state.diario].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  getTotales() {
    let entradas = 0, salidas = 0;
    for (const r of this.state.diario) {
      if (r.tipo === "venta") entradas += r.valor || 0;
      else if (r.tipo === "compra") salidas += r.valor || 0;
      // traslado: movimiento interno, no afecta entradas/salidas
    }
    return { entradas, salidas, saldo: entradas - salidas };
  }

  addRegistro({ fecha, tipo, productoId, productoNombreNuevo, valor, cantidad, comentario }) {
    let pid = productoId || null;
    let pNombre = null;

    if (tipo === "compra") {
      const val = parseFlexibleNumber(valor);
      const cant = parseFlexibleNumber(cantidad);

      if (!pid && productoNombreNuevo && productoNombreNuevo.trim()) {
        // crear producto nuevo desde el Libro diario
        const nuevo = this.addProducto({
          producto: productoNombreNuevo,
          cantidad: cant,
          unidad: "",
          costoUnitario: cant > 0 ? val / cant : 0,
        });
        pid = nuevo.id;
      } else if (pid) {
        const existing = this.findProductoById(pid);
        if (existing) {
          existing.cantidad = (existing.cantidad || 0) + cant;
          if (cant > 0) existing.costoUnitario = val / cant;
        }
      }
      const prod = pid ? this.findProductoById(pid) : null;
      pNombre = prod ? prod.producto : (productoNombreNuevo || null);
    }

    const registro = {
      id: uid(),
      fecha: fecha,
      tipo,
      productoId: pid,
      productoNombre: pNombre,
      valor: (tipo === "compra" || tipo === "venta" || tipo === "traslado") ? parseFlexibleNumber(valor) : null,
      cantidad: tipo === "compra" ? parseFlexibleNumber(cantidad) : null,
      comentario: (comentario || "").trim(),
      createdAt: Date.now(),
    };
    this.state.diario.push(registro);
    this._persist();
    return registro;
  }

  deleteRegistro(id) {
    this.state.diario = this.state.diario.filter((r) => r.id !== id);
    this._persist();
  }

  // =========================================================
  // COSTOS (Pestaña 2) — componentes agrupados por Referencia
  // =========================================================
  listCostosAgrupados() {
    const groups = new Map();
    for (const c of this.state.costos) {
      const key = c.referencia || "(sin referencia)";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    const result = [];
    for (const [referencia, items] of groups.entries()) {
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const total = items.reduce((s, it) => s + (it.costoTotal || 0), 0);
      result.push({ referencia, items, total });
    }
    result.sort((a, b) => a.referencia.localeCompare(b.referencia, "es"));
    return result;
  }

  _recalcComponente(c) {
    const f = evalFormula(c.costoUnitarioFormula);
    c.costoUnitario = f.ok ? f.value : parseFlexibleNumber(c.costoUnitarioFormula);
    c.costoTotal = c.costoUnitario * (c.cantidad || 0);
  }

  addReferenciaGroup(nombreReferencia) {
    const referencia = (nombreReferencia || "Nueva referencia").trim();
    const c = {
      id: uid(),
      referencia,
      productoId: null,
      productoNombre: "",
      cantidad: 1,
      unidad: "",
      costoUnitarioFormula: "0",
      costoUnitario: 0,
      costoTotal: 0,
      createdAt: Date.now(),
    };
    this.state.costos.push(c);
    this._persist();
    return c;
  }

  addComponente(referencia) {
    const c = {
      id: uid(),
      referencia,
      productoId: null,
      productoNombre: "",
      cantidad: 1,
      unidad: "",
      costoUnitarioFormula: "0",
      costoUnitario: 0,
      costoTotal: 0,
      createdAt: Date.now(),
    };
    this.state.costos.push(c);
    this._persist();
    return c;
  }

  updateComponente(id, patch) {
    const c = this.state.costos.find((x) => x.id === id);
    if (!c) return;
    if (patch.referencia !== undefined) c.referencia = String(patch.referencia).trim();
    if (patch.productoId !== undefined) c.productoId = patch.productoId;
    if (patch.productoNombre !== undefined) c.productoNombre = patch.productoNombre;
    if (patch.unidad !== undefined) c.unidad = patch.unidad;
    if (patch.cantidad !== undefined) c.cantidad = parseFlexibleNumber(patch.cantidad);
    if (patch.costoUnitarioFormula !== undefined) c.costoUnitarioFormula = String(patch.costoUnitarioFormula);
    this._recalcComponente(c);
    this._persist();
  }

  deleteComponente(id) {
    this.state.costos = this.state.costos.filter((c) => c.id !== id);
    this._persist();
  }

  renameReferencia(oldName, newName) {
    newName = (newName || "").trim() || oldName;
    this.state.costos.forEach((c) => { if (c.referencia === oldName) c.referencia = newName; });
    this._persist();
  }

  deleteReferenciaGroup(referencia) {
    this.state.costos = this.state.costos.filter((c) => c.referencia !== referencia);
    this._persist();
  }

  importCostosCSV(rows, pick) {
    let count = 0;
    rows.forEach((r) => {
      const referencia = pick(r, "Referencia") || pick(r, "Ref") || "(sin referencia)";
      const producto = pick(r, "Producto") || "";
      if (!producto && !pick(r, "Referencia")) return;
      // Si la celda de Cantidad viene vacía (p. ej. "Mano de obra"), se asume 1
      // (una tarifa plana) en vez de 0, para no anular ese costo del Total Ref.
      // Un "0" explícito en el CSV sí se respeta como cero.
      const cantidadRaw = pick(r, "Cantidad");
      const cantidad = (cantidadRaw === undefined || String(cantidadRaw).trim() === "")
        ? 1
        : parseFlexibleNumber(cantidadRaw);
      const unidad = pick(r, "Unidad de medida", "Unidad") || "";
      let formulaRaw = pick(r, "Costo Unitario", "Costo unitario");
      if (formulaRaw === undefined || formulaRaw === "") formulaRaw = "0";
      const existingProd = this.findProductoByName(producto);
      const c = {
        id: uid(),
        referencia: referencia.trim(),
        productoId: existingProd ? existingProd.id : null,
        productoNombre: producto.trim(),
        cantidad,
        unidad,
        costoUnitarioFormula: String(formulaRaw),
        costoUnitario: 0,
        costoTotal: 0,
        createdAt: Date.now() + count,
      };
      this._recalcComponente(c);
      this.state.costos.push(c);
      count++;
    });
    this._persist();
    return { count };
  }

  // =========================================================
  // Backup / Restore (memoria en JSON)
  // =========================================================
  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("Archivo JSON no válido");
    this.state = {
      schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
      meta: parsed.meta || { lastModified: new Date().toISOString() },
      diario: Array.isArray(parsed.diario) ? parsed.diario : [],
      productos: Array.isArray(parsed.productos) ? parsed.productos : [],
      costos: Array.isArray(parsed.costos) ? parsed.costos : [],
    };
    this._persist();
  }

  wipeAll() {
    this.state = emptyState();
    this._persist();
  }
}

export const store = new Store();
