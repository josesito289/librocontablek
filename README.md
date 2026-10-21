# 📒 Libro Contable · Anchetas (PWA)

App web progresiva (PWA) a modo de hoja de cálculo personalizada para llevar el
libro diario de ventas/compras, el costeo de productos compuestos (por
referencia) y el catálogo maestro de productos. Pensada para instalarse en un
Android (probada para Motorola G24) y **funcionar 100% sin conexión**.

No usa frameworks ni librerías externas en tiempo de ejecución: es HTML, CSS y
JavaScript puro (ES modules), con las tipografías auto-alojadas dentro del
proyecto. Así no depende de ningún CDN ni de internet para funcionar, ni en el
primer uso ni después.

---

## 1. Qué incluye cada pestaña

### 📒 Pestaña 1 — Libro diario
- 3 recuadros: **Entradas** (suma de Ventas), **Salidas** (suma de Compras) y
  **Saldo actual** (Entradas − Salidas).
- Formulario rápido para registrar: Fecha (por defecto hoy), Tipo
  (Venta/Compra/Traslado), Producto (solo para Compra, buscar o **crear uno
  nuevo**), Valor, Cantidad (solo Compra) y Comentario.
- Los registros se muestran **del más reciente al más antiguo**, así nunca
  hay que scrollear para ver lo último ingresado.
- Botones **Guardar respaldo** (descarga un `.json` con todos los datos de la
  app) y **Cargar respaldo** (restaura un `.json` descargado antes).

### 🧮 Pestaña 2 — Costo de productos
- Botón **Cargar productos CSV** (mismo formato del archivo de ejemplo que
  compartiste, columnas con `;`).
- Las referencias (kits, p. ej. "Ancheta #1 Verde Rojo") se muestran
  **agrupadas**: cada tarjeta es una Referencia con su **Total Ref.**
  calculado automáticamente (suma de "Costo total" de todos sus componentes),
  y debajo la lista de componentes (Producto, Cantidad, Unidad, Costo
  Unitario, Costo total).
- **Costo total** = Costo Unitario × Cantidad (automático).
- **Costo Unitario** admite fórmulas: escribe `=4/2` y al confirmar muestra
  `2`. Soporta `+ − × ÷` y paréntesis.
- El campo Producto busca entre los productos de la Pestaña 3; al
  seleccionarlo, autocompleta Unidad y Costo Unitario. **Aquí no se pueden
  crear productos nuevos** (según lo pediste, solo se crean desde la
  Pestaña 1 o la Pestaña 3).
- Todo se guarda automáticamente a medida que editas, sin botón "guardar".

### 📦 Pestaña 3 — Productos
- Botón **Cargar productos CSV** (formato: `Producto;Cantidad;Unidad de
  medida;Costo Unitario`).
- Lista editable: Producto, Cantidad, Unidad de medida, Costo Unitario.
- Botón **+ Nuevo producto** para crearlos manualmente aquí también.
- Cuando registras una **Compra** en la Pestaña 1, el producto se crea o
  actualiza aquí automáticamente, y su Costo Unitario queda como
  `Valor ÷ Cantidad` (tal como pediste), y la Cantidad se acumula.

---

## 2. Decisiones de diseño (donde el pedido tenía ambigüedad)

Usé mi criterio en estos puntos, como me pediste:

1. **Crear producto nuevo desde la Pestaña 1**: el campo Producto es un
   buscador. Si escribes un nombre que no existe, aparece la opción
   **"➕ Crear producto “…”"** al final de la lista desplegable. Al
   seleccionarla, el producto se crea automáticamente y queda enlazado al
   registro de Compra.
2. **Campo "Valor" en el Libro diario**: lo pediste activo solo para
   "Compra", pero "Venta" también necesita un valor para poder sumar a
   Entradas — si no, Entradas siempre sería $0. Por eso **Valor está activo
   para Venta y Compra**. Para **Traslado** lo dejé activo también (por si
   quieres anotar un monto, p. ej. mover dinero de caja a banco), pero **no
   se contabiliza** en Entradas/Salidas/Saldo, porque un traslado no es ni
   venta ni compra.
3. **"Referencia" / "Ref" / "Total Ref" (Pestaña 2)**: en tu CSV estas
   columnas se repiten por fila como si vinieran de celdas combinadas. En la
   app las unifiqué: cada grupo de componentes tiene **un solo encabezado**
   con el nombre de la Referencia y su Total, en vez de repetir el texto en
   cada fila — ahorra espacio y es más claro en pantalla de celular, tal
   como pediste ("info reducida").
4. **Orden de columnas en Pestaña 2**: en pantalla, "Costo Unitario" va antes
   que "Costo total" porque el primero se escribe y el segundo se calcula
   solo; esto no cambia el CSV de carga, que se sigue leyendo por nombre de
   columna sin importar el orden.

---

## 3. Memoria, respaldo y modo sin conexión

- **Memoria interna**: todos los datos se guardan automáticamente en el
  propio teléfono (`localStorage`), en formato JSON. No necesitas guardar
  manualmente mientras usas la app — solo al editar ya queda guardado.
- **Respaldo descargable**: el botón "Guardar respaldo" (Pestaña 1) descarga
  un archivo `.json` con *todo* (diario, productos y costos). Guárdalo en
  Drive, WhatsApp a ti mismo, etc.
- **Restaurar**: el botón "Cargar respaldo" reemplaza los datos actuales por
  los del `.json` elegido (pide confirmación antes de reemplazar).
- **Sin conexión**: un *service worker* (`service-worker.js`) guarda en caché
  todos los archivos de la app (HTML, CSS, JS, fuentes e íconos) la primera
  vez que la abres con internet. Después de eso, abre y funciona
  completamente sin señal — los datos siempre viven en el teléfono, nunca en
  un servidor.

---

## 4. Cómo publicarla en GitHub (para instalarla en el Motorola G24)

1. Crea un repositorio nuevo en GitHub (puede ser público o privado) y sube
   **todo el contenido de esta carpeta** (no la carpeta contenedora, sino los
   archivos `index.html`, `manifest.webmanifest`, `css/`, `js/`, etc.
   directamente en la raíz del repo).
2. En el repositorio: **Settings → Pages → Source**, selecciona la rama
   (`main`) y la carpeta `/ (root)`. Guarda.
3. GitHub te dará una URL parecida a
   `https://tu-usuario.github.io/tu-repo/`. Espera 1–2 minutos a que se
   publique.
4. Abre esa URL **desde el Chrome del Motorola G24**. Debe cargar con
   conexión la primera vez (para que el service worker guarde todo en
   caché).
5. Aparecerá el botón **"⬇️ Instalar"** en la app, o el menú ⋮ de Chrome →
   **"Instalar aplicación" / "Agregar a pantalla de inicio"**. Una vez
   instalada, el ícono queda en el teléfono como una app normal y abre sin
   necesidad de Chrome ni de internet.

> ⚠️ Las PWA necesitan servirse por **HTTPS** (GitHub Pages lo da gratis) o
> desde `localhost`. Abrir `index.html` con doble clic (protocolo `file://`)
> no activa el service worker ni el instalador — para eso usa el paso 6 solo
> si quieres probar en tu computador antes de subirlo.

6. **(Opcional) Probar en el computador antes de subir a GitHub**: abre una
   terminal en esta carpeta y corre `python3 -m http.server 8080`, luego
   visita `http://localhost:8080` en el navegador.

---

## 5. Formato esperado de los CSV

Separador `;` (los mismos archivos que me compartiste funcionan tal cual).
Las columnas se detectan **por nombre**, sin importar mayúsculas/minúsculas
ni el orden:

**Pestaña 3 — Productos** (`sample-data/ejemplo-pestana3-productos.csv`):
```
Producto;Cantidad;Unidad de medida;Costo Unitario
Zuncho Un tono;40;metro;$ 200
```

**Pestaña 2 — Costo de productos** (`sample-data/ejemplo-pestana2-costos.csv`):
```
Referencia;Producto;Cantidad;Unidad de medida;Costo total;Costo Unitario;Ref;Total Ref
Ancheta #1 Verde Rojo;Zuncho Un tono;40;metro;$ 8,00;$ 200;Ancheta #1 Verde Rojo;$ 11,98
```
(La columna "Costo total" del CSV no se usa al importar — la app la vuelve a
calcular siempre como Costo Unitario × Cantidad, para que nunca quede
desactualizada.)

Los dos archivos que me enviaste quedaron dentro de `sample-data/` como
ejemplo/prueba; no los carga la app automáticamente, son solo para que los
uses con el botón "Cargar productos CSV" si quieres probar.

---

## 6. Estructura de archivos

```
anchetas-pwa/
├── index.html              # estructura de las 3 pestañas
├── manifest.webmanifest    # metadata de instalación (PWA)
├── service-worker.js       # caché para modo sin conexión
├── css/
│   └── styles.css          # tokens de diseño + estilos
├── js/
│   ├── app.js               # arranque, pestañas, instalar, online/offline
│   ├── store.js             # datos + lógica de negocio + localStorage
│   ├── formula.js           # evaluador de fórmulas (=4/2, sin usar eval)
│   ├── combobox.js          # buscador/selector reutilizable
│   ├── utils.js             # formatos, CSV, helpers
│   ├── tabDiario.js         # Pestaña 1
│   ├── tabCostos.js         # Pestaña 2
│   └── tabProductos.js      # Pestaña 3
├── fonts/                   # Poppins + Inter auto-alojadas (offline)
├── icons/                   # íconos PWA (192/512, normal y maskable)
├── sample-data/             # tus CSV de ejemplo
├── README.md
└── CHANGELOG.md
```

## 7. Diseño visual

- Tipografías sin serifa: **Poppins** (títulos/botones) + **Inter** (texto y
  tablas), auto-alojadas para que funcionen sin internet.
- Paleta formal pero femenina, sin verse infantil: fondo blush cálido
  (`#fbf5f4`), vino (`#a63a50`) como color principal, oro (`#c99a24`) y
  salvia (`#4f7d64`) como acentos.
- Interfaz plana: casi no hay bordes/líneas duras, se usan fondos suaves y
  tarjetas redondeadas para separar secciones.
- Pensada para **orientación horizontal** (y también funciona en vertical):
  las listas usan ancho flexible y scroll horizontal donde haga falta en
  pantallas angostas.

## 8. Ideas para seguir mejorando (no incluidas todavía)

- Edición/eliminación de registros del Libro diario (hoy solo se puede
  eliminar, no editar in-place).
- Exportar el libro diario o el costeo a CSV/Excel.
- Historial de cambios de Costo Unitario por producto.
- Buscador/filtro de registros por fecha o tipo.

Si quieres cualquiera de estas (u otra cosa), dime y seguimos con la
"Parte 4".
