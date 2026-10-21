// combobox.js — campo de búsqueda + lista desplegable reutilizable.
// Usado para seleccionar Producto en Pestaña 1 (Compra) y Pestaña 2 (componentes).

import { escapeHtml } from "./utils.js";

/**
 * @param {Object} opts
 * @param {HTMLInputElement} opts.inputEl
 * @param {HTMLElement} opts.listEl        contenedor de la lista (se le pone .open)
 * @param {() => Array<{id:string,label:string,meta?:string}>} opts.getOptions
 * @param {(opt:{id:string,label:string}) => void} opts.onSelect
 * @param {boolean} [opts.allowCreate]
 * @param {(text:string) => void} [opts.onCreate]
 */
export function createCombobox({ inputEl, listEl, getOptions, onSelect, allowCreate = false, onCreate }) {
  let items = [];
  let hlIndex = -1;

  function render(query) {
    const q = (query || "").trim().toLowerCase();
    const all = getOptions();
    const filtered = q
      ? all.filter((o) => o.label.toLowerCase().includes(q))
      : all;
    items = filtered.slice(0, 40);

    const exactMatch = all.some((o) => o.label.trim().toLowerCase() === q);

    let html = "";
    if (!items.length) {
      html += `<div class="combo-empty">Sin resultados</div>`;
    } else {
      items.forEach((o, i) => {
        html += `<div class="combo-opt${i === hlIndex ? " hl" : ""}" data-idx="${i}">
          <span>${escapeHtml(o.label)}</span>
          ${o.meta ? `<span class="meta">${escapeHtml(o.meta)}</span>` : ""}
        </div>`;
      });
    }
    if (allowCreate && q && !exactMatch) {
      html += `<div class="combo-opt create" data-create="1">➕ Crear producto “${escapeHtml(query.trim())}”</div>`;
    }
    listEl.innerHTML = html;
    listEl.classList.add("open");

    listEl.querySelectorAll(".combo-opt[data-idx]").forEach((el) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.idx);
        const opt = items[idx];
        if (opt) { onSelect(opt); close(); }
      });
    });
    const createEl = listEl.querySelector('.combo-opt[data-create]');
    if (createEl) {
      createEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        onCreate && onCreate(inputEl.value.trim());
        close();
      });
    }
  }

  function open() { render(inputEl.value); }
  function close() { listEl.classList.remove("open"); listEl.innerHTML = ""; hlIndex = -1; }

  inputEl.addEventListener("focus", open);
  inputEl.addEventListener("input", () => { hlIndex = -1; render(inputEl.value); });
  inputEl.addEventListener("keydown", (e) => {
    if (!listEl.classList.contains("open")) return;
    const opts = listEl.querySelectorAll(".combo-opt[data-idx]");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      hlIndex = Math.min(hlIndex + 1, opts.length - 1);
      render(inputEl.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hlIndex = Math.max(hlIndex - 1, 0);
      render(inputEl.value);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hlIndex >= 0 && items[hlIndex]) { onSelect(items[hlIndex]); close(); }
      else if (allowCreate && inputEl.value.trim()) { onCreate && onCreate(inputEl.value.trim()); close(); }
    } else if (e.key === "Escape") {
      close();
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target !== inputEl && !listEl.contains(e.target)) close();
  });

  return { close, refresh: () => { if (listEl.classList.contains("open")) render(inputEl.value); } };
}
