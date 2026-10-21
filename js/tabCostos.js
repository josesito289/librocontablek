// tabCostos.js — Pestaña 2: Costo de productos, agrupado por Referencia

import { store } from "./store.js";
import { parseCSV, pick, readFileAsText, toast, fmtMoney, escapeHtml } from "./utils.js";
import { createCombobox } from "./combobox.js";
import { isFormula } from "./formula.js";

let els = {};

export function initTabCostos() {
  els = {
    groups: document.getElementById("c-groups"),
    btnCSV: document.getElementById("c-btn-csv"),
    fileCSV: document.getElementById("c-file-csv"),
    btnNuevaRef: document.getElementById("c-btn-nueva-ref"),
  };

  els.btnCSV.addEventListener("click", () => els.fileCSV.click());
  els.fileCSV.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const { rows } = parseCSV(text);
      const { count } = store.importCostosCSV(rows, pick);
      toast(`CSV cargado: ${count} filas ✅`);
    } catch (err) {
      console.error(err);
      toast("⚠️ No se pudo leer el CSV");
    }
    e.target.value = "";
  });

  els.btnNuevaRef.addEventListener("click", () => {
    const nombre = prompt("Nombre de la nueva referencia (kit/producto compuesto):", "Nueva referencia");
    if (nombre === null) return;
    store.addReferenciaGroup(nombre);
  });

  store.subscribe(render);
  render();
}

function render() {
  const groups = store.listCostosAgrupados();
  if (!groups.length) {
    els.groups.innerHTML = `
      <div class="empty-state">
        <span class="big">🧮</span>
        <strong>Sin referencias todavía</strong>
        <span class="small">Carga un CSV o crea una referencia para armar su costo por componentes.</span>
      </div>`;
    return;
  }

  els.groups.innerHTML = groups.map((g) => `
    <div class="ref-group" data-ref="${escapeHtml(g.referencia)}">
      <div class="ref-head">
        <input class="ref-name-input" type="text" value="${escapeHtml(g.referencia)}" data-rename aria-label="Nombre de la referencia">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="ref-total">${fmtMoney(g.total)}</span>
          <button class="btn-icon" data-del-group title="Eliminar referencia" aria-label="Eliminar referencia">🗑</button>
        </div>
      </div>
      <div class="ref-body">
        <div class="comp-headrow">
          <span>Producto</span><span>Cant.</span><span class="col-unidad">Unidad</span><span>C. Unit.</span><span>C. Total</span><span></span>
        </div>
        ${g.items.map((c) => rowHTML(c)).join("")}
        <div class="actions-row">
          <button class="btn btn-ghost btn-sm" data-add-comp>+ Componente</button>
        </div>
      </div>
    </div>`).join("");

  wireGroupEvents(groups);
}

function rowHTML(c) {
  return `
    <div class="comp-row" data-id="${c.id}">
      <div class="combo">
        <input type="text" value="${escapeHtml(c.productoNombre || "")}" data-field="productoNombre" placeholder="Buscar producto…" autocomplete="off">
        <div class="combo-list"></div>
      </div>
      <input type="number" step="any" value="${c.cantidad ?? 0}" data-field="cantidad">
      <input type="text" value="${escapeHtml(c.unidad || "")}" data-field="unidad" class="col-unidad">
      <input type="text" value="${formatUnitCellValue(c)}" data-field="costoUnitarioFormula" inputmode="decimal" title="Puedes escribir una fórmula, ej: =4/2">
      <span style="font-size:12px;font-weight:600;">${fmtMoney(c.costoTotal)}</span>
      <button class="comp-del" data-del title="Eliminar componente" aria-label="Eliminar componente">✕</button>
    </div>`;
}

function formatUnitCellValue(c) {
  // Muestra el número ya calculado (no la fórmula cruda) cuando el campo no está en foco.
  return String(round2(c.costoUnitario));
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function wireGroupEvents(groups) {
  els.groups.querySelectorAll(".ref-group").forEach((groupEl) => {
    const referencia = groupEl.dataset.ref;

    const renameInput = groupEl.querySelector("[data-rename]");
    renameInput.addEventListener("blur", () => {
      const val = renameInput.value.trim();
      if (val && val !== referencia) store.renameReferencia(referencia, val);
    });
    renameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") renameInput.blur(); });

    groupEl.querySelector("[data-del-group]").addEventListener("click", () => {
      if (confirm(`¿Eliminar la referencia “${referencia}” y todos sus componentes?`)) {
        store.deleteReferenciaGroup(referencia);
      }
    });

    groupEl.querySelector("[data-add-comp]").addEventListener("click", () => {
      store.addComponente(referencia);
    });

    groupEl.querySelectorAll(".comp-row").forEach((row) => wireRow(row, referencia));
  });
}

function wireRow(row, referencia) {
  const id = row.dataset.id;
  const comp = store.state.costos.find((c) => c.id === id);
  if (!comp) return;

  const prodInput = row.querySelector('[data-field="productoNombre"]');
  const comboList = row.querySelector(".combo-list");
  const cantInput = row.querySelector('[data-field="cantidad"]');
  const unidadInput = row.querySelector('[data-field="unidad"]');
  const costoInput = row.querySelector('[data-field="costoUnitarioFormula"]');
  const delBtn = row.querySelector("[data-del]");

  createCombobox({
    inputEl: prodInput,
    listEl: comboList,
    allowCreate: false,
    getOptions: () => store.listProductos().map((p) => ({ id: p.id, label: p.producto, meta: p.unidad || "" })),
    onSelect: (opt) => {
      const prod = store.findProductoById(opt.id);
      prodInput.value = opt.label;
      unidadInput.value = prod ? prod.unidad : "";
      costoInput.value = prod ? String(round2(prod.costoUnitario)) : costoInput.value;
      store.updateComponente(id, {
        productoId: opt.id,
        productoNombre: opt.label,
        unidad: prod ? prod.unidad : unidadInput.value,
        costoUnitarioFormula: prod ? String(prod.costoUnitario) : costoInput.value,
      });
    },
  });
  prodInput.addEventListener("input", () => {
    store.updateComponente(id, { productoId: null, productoNombre: prodInput.value });
  });
  prodInput.addEventListener("blur", () => {
    if (!store.listProductos().some((p) => p.producto.trim().toLowerCase() === prodInput.value.trim().toLowerCase())) {
      if (prodInput.value.trim()) toast('Ese producto no existe. Créalo en "Libro diario" o en "Productos".');
    }
  });

  cantInput.addEventListener("change", () => store.updateComponente(id, { cantidad: cantInput.value }));
  unidadInput.addEventListener("change", () => store.updateComponente(id, { unidad: unidadInput.value }));

  costoInput.addEventListener("focus", () => {
    const fresh = store.state.costos.find((c) => c.id === id);
    if (fresh) costoInput.value = fresh.costoUnitarioFormula;
    costoInput.select();
  });
  costoInput.addEventListener("change", () => {
    store.updateComponente(id, { costoUnitarioFormula: costoInput.value });
  });

  delBtn.addEventListener("click", () => {
    if (confirm("¿Eliminar este componente?")) store.deleteComponente(id);
  });
}
