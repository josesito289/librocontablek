// tabProductos.js — Pestaña 3: Productos (catálogo maestro)

import { store } from "./store.js";
import { parseCSV, pick, readFileAsText, toast, debounce, escapeHtml } from "./utils.js";

let els = {};

export function initTabProductos() {
  els = {
    list: document.getElementById("p-list"),
    btnCSV: document.getElementById("p-btn-csv"),
    fileCSV: document.getElementById("p-file-csv"),
    btnNuevo: document.getElementById("p-btn-nuevo"),
  };

  els.btnCSV.addEventListener("click", () => els.fileCSV.click());
  els.fileCSV.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const { rows } = parseCSV(text);
      const { created, updated } = store.importProductosCSV(rows, pick);
      toast(`CSV cargado: ${created} creados, ${updated} actualizados ✅`);
    } catch (err) {
      console.error(err);
      toast("⚠️ No se pudo leer el CSV");
    }
    e.target.value = "";
  });

  els.btnNuevo.addEventListener("click", () => {
    const p = store.addProducto({ producto: "Nuevo producto", cantidad: 0, unidad: "", costoUnitario: 0 });
    requestAnimationFrame(() => {
      const row = els.list.querySelector(`[data-id="${p.id}"] input[data-field="producto"]`);
      if (row) { row.focus(); row.select(); }
    });
  });

  store.subscribe(render);
  render();
}

const debouncedUpdate = debounce((id, field, value) => {
  store.updateProducto(id, { [field]: value });
}, 350);

function render() {
  const productos = store.listProductos();
  if (!productos.length) {
    els.list.innerHTML = `
      <div class="empty-state">
        <span class="big">📦</span>
        <strong>Todavía no hay productos</strong>
        <span class="small">Crea uno con “+ Nuevo producto”, carga un CSV, o regístralo como Compra en el Libro diario.</span>
      </div>`;
    return;
  }

  els.list.innerHTML = `
    <div class="prod-headrow">
      <span>Producto</span><span>Cant.</span><span class="col-unidad">Unidad</span><span>Costo Unit.</span><span></span>
    </div>
    ` + productos.map((p) => `
      <div class="prod-row" data-id="${p.id}">
        <input type="text" value="${escapeHtml(p.producto)}" data-field="producto" aria-label="Nombre del producto">
        <input type="number" step="any" value="${p.cantidad ?? 0}" data-field="cantidad" aria-label="Cantidad">
        <input type="text" value="${escapeHtml(p.unidad)}" data-field="unidad" class="col-unidad" aria-label="Unidad de medida">
        <input type="number" step="any" value="${p.costoUnitario ?? 0}" data-field="costoUnitario" aria-label="Costo unitario">
        <button class="comp-del" data-del="${p.id}" title="Eliminar" aria-label="Eliminar producto">✕</button>
      </div>`).join("");

  els.list.querySelectorAll(".prod-row").forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        debouncedUpdate(id, input.dataset.field, input.value);
      });
    });
    row.querySelector("[data-del]").addEventListener("click", () => {
      if (confirm("¿Eliminar este producto del catálogo?")) store.deleteProducto(id);
    });
  });
}
