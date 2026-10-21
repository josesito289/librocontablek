// formula.js — evalúa expresiones aritméticas simples tipo "=4/2", "=(10+2)*3"
// Implementado con un parser recursivo propio (NO usa eval ni Function) por seguridad.
// Soporta: + - * / ( ) números con punto o coma decimal.

class FormulaError extends Error {}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("+-*/()".includes(c)) { tokens.push({ t: c }); i++; continue; }
    if (/[0-9.,]/.test(c)) {
      let s = "";
      while (i < expr.length && /[0-9.,]/.test(expr[i])) { s += expr[i]; i++; }
      s = s.replace(",", ".");
      const n = parseFloat(s);
      if (Number.isNaN(n)) throw new FormulaError("Número inválido: " + s);
      tokens.push({ t: "num", v: n });
      continue;
    }
    throw new FormulaError("Carácter no permitido: " + c);
  }
  return tokens;
}

// Gramática: expr := term (('+'|'-') term)*
//            term := factor (('*'|'/') factor)*
//            factor := num | '(' expr ')' | '-' factor
function parseExpr(tokens) {
  let pos = 0;
  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }

  function factor() {
    const tok = peek();
    if (!tok) throw new FormulaError("Expresión incompleta");
    if (tok.t === "num") { next(); return tok.v; }
    if (tok.t === "(") {
      next();
      const v = expr();
      if (!peek() || peek().t !== ")") throw new FormulaError("Falta ')'");
      next();
      return v;
    }
    if (tok.t === "-") { next(); return -factor(); }
    if (tok.t === "+") { next(); return factor(); }
    throw new FormulaError("Token inesperado");
  }

  function term() {
    let v = factor();
    while (peek() && (peek().t === "*" || peek().t === "/")) {
      const op = next().t;
      const rhs = factor();
      if (op === "*") v *= rhs;
      else {
        if (rhs === 0) throw new FormulaError("División entre 0");
        v /= rhs;
      }
    }
    return v;
  }

  function expr() {
    let v = term();
    while (peek() && (peek().t === "+" || peek().t === "-")) {
      const op = next().t;
      const rhs = term();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }

  const result = expr();
  if (pos !== tokens.length) throw new FormulaError("Expresión mal formada");
  return result;
}

// Punto de entrada: recibe el texto crudo de la celda.
// - Si empieza con "=" evalúa la fórmula.
// - Si no, intenta leerlo como número flexible (ver utils.parseFlexibleNumber en el caller).
// Devuelve { ok: true, value } o { ok: false, error }
export function evalFormula(raw) {
  if (typeof raw !== "string" || !raw.trim().startsWith("=")) {
    return { ok: false, error: "No es una fórmula" };
  }
  const body = raw.trim().slice(1);
  try {
    const tokens = tokenize(body);
    if (!tokens.length) throw new FormulaError("Fórmula vacía");
    const value = parseExpr(tokens);
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e.message || "Fórmula inválida" };
  }
}

export function isFormula(raw) {
  return typeof raw === "string" && raw.trim().startsWith("=");
}
