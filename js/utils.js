// utils.js — helpers compartidos (sin dependencias externas)

export function uid() {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const currencyFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "$ 0";
  return currencyFmt.format(n);
}

// Convierte texto numérico tolerando formato colombiano ("$ 1.234,56" o "1,5")
// y notación simple con punto decimal ("1234.56"). No evalúa fórmulas (ver formula.js).
export function parseFlexibleNumber(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  let s = String(raw).trim();
  if (s === "") return 0;
  s = s.replace(/\$/g, "").replace(/\s/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // el último separador es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // coma como decimal (formato CO), salvo que parezca miles (más de 3 dígitos tras la coma)
    const parts = s.split(",");
    if (parts[1] && parts[1].length === 3 && parts.length === 2 && parts[0].length <= 3) {
      // ambiguo tipo "1,234" -> lo tratamos como miles
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function toast(msg, ms = 2200) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), ms);
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------- CSV ----------
// Parser simple y robusto para CSV con delimitador ; o , y comillas opcionales.
export function parseCSV(text) {
  // quita BOM
  text = text.replace(/^\uFEFF/, "");
  const delim = (text.slice(0, 400).split(";").length >= text.slice(0, 400).split(",").length) ? ";" : ",";
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const clean = rows.filter((r) => r.some((c) => String(c).trim() !== ""));
  if (!clean.length) return { headers: [], rows: [] };
  const headers = clean[0].map((h) => h.trim());
  const dataRows = clean.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
  return { headers, rows: dataRows };
}

// Busca el valor de una fila CSV probando varias posibles cabeceras (case-insensitive)
export function pick(rowObj, ...names) {
  const keys = Object.keys(rowObj);
  for (const n of names) {
    const found = keys.find((k) => k.toLowerCase().trim() === n.toLowerCase().trim());
    if (found !== undefined) return rowObj[found];
  }
  return undefined;
}

export function downloadTextFile(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file, "utf-8");
  });
}
