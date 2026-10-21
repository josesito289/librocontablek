// tabDiario.js — Pestaña 1: Libro diario

import { store } from "./store.js";
import { uid, todayISO, fmtDate, fmtMoney, parseFlexibleNumber, toast, downloadTextFile, readFileAsText, escapeHtml } from "./utils.js";
import { createCombobox } from "./combobox.js";

let els = {};
let selectedProductoId = null;
let selectedProductoNuevo = "";

export function initTabDiario() {
  els = {
    statEntradas: document.getElementById("stat-entradas"),
    statSalidas: document.getElementById("stat-salidas"),
    statSaldo: document.getElementById("stat-saldo"),
    fecha: document.getElementById("d-fecha"),
    tipo: document.getElementById("d-tipo"),
    productoWrap: document.getElementById("d-producto-wrap"),
    producto: document.getElementById("d-producto"),
    productoList: document.getElementById("d-producto-list"),
    valorWrap: document.getElementById("d-valor-wrap"),
    valor: document.getElementById("d-valor"),
    cantWrap: document.getElementById("d-cant-wrap"),
    cant: document.getElementById("d-cant"),
    coment: document.getElementById("d-coment"),
    btnGuardar: document.getElementById("d-btn-guardar"),
    list: document.getElementById("d-record-list"),
    btnBackup: document.getElementById("d-btn-backup"),
    btnRestore: document.getElementById("d-btn-restore"),
    fileRestore: document.getElementById("d-file-restore"),
  };

  els.fecha.value = todayISO();
  updateFieldVisibility();

  els.tipo.addEventListener("change", () => {
    updateFieldVisibility();
  });

  createCombobox({
    inputEl: els.producto,
    listEl: els.productoList,
    allowCreate: true,
    getOptions: () => store.listProductos().map((p) => ({
      id: p.id, label: p.producto, meta: p.unidad || "",
    })),
    onSelect: (opt) => {
      selectedProductoId = opt.id;
      selectedProductoNuevo = "";
      els.producto.value = opt.label;
    },
    onCreate: (text) => {
      selectedProductoId = null;
      selectedProductoNuevo = text;
      els.producto.value = text;
      toast(`Se creará “${text}” como producto nuevo al guardar`);
    },
  });

  els.producto.addEventListener("input", () => {
    selectedProductoId = null;
    selectedProductoNuevo = "";
  });

  els.btnGuardar.addEventListener("click", onGuardar);

  els.btnBackup.addEventListener("click", () => {
    const json = store.exportJSON();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadTextFile(`respaldo-anchetas-${stamp}.json`, json);
    toast("Respaldo descargado ✅");
  });

  els.btnRestore.addEventListener("click", () => els.fileRestore.click());
  els.fileRestore.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Esto reemplazará todos los datos actuales por los del archivo de respaldo. ¿Continuar?")) {
      e.target.value = "";
      return;
    }
    try {
      const text = await readFileAsText(file);
      store.importJSON(text);
      toast("Respaldo cargado ✅");
    } catch (err) {
      console.error(err);
      toast("⚠️ El archivo no es un respaldo JSON válido");
    }
    e.target.value = "";
  });

  store.subscribe(render);
  render();
}

function updateFieldVisibility() {
  const tipo = els.tipo.value;
  const esCompra = tipo === "compra";
  els.producto.disabled = !esCompra;
  els.cant.disabled = !esCompra;
  els.productoWrap.style.opacity = esCompra ? "1" : ".5";
  els.cantWrap.style.opacity = esCompra ? "1" : ".5";
  if (!esCompra) {
    els.producto.value = "";
    els.cant.value = "";
    selectedProductoId = null;
    selectedProductoNuevo = "";
  }
  // Valor aplica a compra y venta (ambas requieren un monto); en traslado queda habilitado
  // como monto informativo, pero no se contabiliza en entradas/salidas (ver README).
  els.valor.disabled = false;
}

function onGuardar() {
  const tipo = els.tipo.value;
  const fecha = els.fecha.value || todayISO();
  const valorRaw = els.valor.value;
  const comentario = els.coment.value;

  if (tipo === "compra") {
    if (!selectedProductoId && !selectedProductoNuevo) {
      toast("⚠️ Selecciona o crea un producto para la compra");
      els.producto.focus();
      return;
    }
    if (!els.cant.value || parseFlexibleNumber(els.cant.value) <= 0) {
      toast("⚠️ Indica la cantidad comprada");
      els.cant.focus();
      return;
    }
  }
  if ((tipo === "compra" || tipo === "venta") && (!valorRaw || parseFlexibleNumber(valorRaw) <= 0)) {
    toast("⚠️ Indica el valor");
    els.valor.focus();
    return;
  }

  store.addRegistro({
    fecha,
    tipo,
    productoId: selectedProductoId,
    productoNombreNuevo: selectedProductoNuevo,
    valor: valorRaw,
    cantidad: els.cant.value,
    comentario,
  });

  // reset parcial, se mantiene fecha y tipo para registrar en serie
  els.producto.value = "";
  els.valor.value = "";
  els.cant.value = "";
  els.coment.value = "";
  selectedProductoId = null;
  selectedProductoNuevo = "";
  toast("Registro guardado ✅");
}

const TIPO_LABEL = { venta: "Venta", compra: "Compra", traslado: "Traslado" };
const TIPO_ICON = { venta: "▲", compra: "▼", traslado: "⇄" };

function render() {
  const { entradas, salidas, saldo } = store.getTotales();
  els.statEntradas.textContent = fmtMoney(entradas);
  els.statSalidas.textContent = fmtMoney(salidas);
  els.statSaldo.textContent = fmtMoney(saldo);

  const registros = store.listDiario();
  if (!registros.length) {
    els.list.innerHTML = `
      <div class="empty-state">
        <span class="big">🧾</span>
        <strong>Aún no hay registros</strong>
        <span class="small">Agrega tu primera venta, compra o traslado arriba.</span>
      </div>`;
    return;
  }

  els.list.innerHTML = registros.map((r) => {
    const valorClass = r.tipo === "venta" ? "pos" : r.tipo === "compra" ? "neg" : "neu";
    const sign = r.tipo === "venta" ? "+" : r.tipo === "compra" ? "-" : "";
    const titleExtra = r.tipo === "compra" && r.productoNombre ? ` · ${escapeHtml(r.productoNombre)}` : "";
    const sub = [fmtDate(r.fecha), r.cantidad ? `Cant. ${r.cantidad}` : null, r.comentario || null]
      .filter(Boolean).join(" · ");
    return `
      <div class="record-row" data-id="${r.id}">
        <div class="record-main">
          <span class="ico ${r.tipo}">${TIPO_ICON[r.tipo]}</span>
          <div class="record-text">
            <div class="record-title">${TIPO_LABEL[r.tipo]}${titleExtra}</div>
            <div class="record-sub">${escapeHtml(sub)}</div>
          </div>
        </div>
        <div class="record-value ${valorClass}">${r.valor ? sign + fmtMoney(r.valor).replace("$", "$ ") : "—"}</div>
        <button class="record-del" data-del="${r.id}" title="Eliminar" aria-label="Eliminar registro">✕</button>
      </div>`;
  }).join("");

  els.list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("¿Eliminar este registro del libro diario?")) {
        store.deleteRegistro(btn.dataset.del);
      }
    });
  });
}
