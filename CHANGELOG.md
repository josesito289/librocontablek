# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.0.0] — Entrega inicial completa
### Added
- Estructura PWA completa: `manifest.webmanifest`, `service-worker.js`
  (caché de app shell para uso 100% sin conexión) y botón "Instalar" cuando
  el navegador lo permite.
- Indicador de estado **En línea / Sin conexión** en el encabezado.
- Memoria de la app en `localStorage` con esquema JSON versionado
  (`schemaVersion`), más **Guardar respaldo** / **Cargar respaldo** en JSON
  descargable (Pestaña 1).
- Tipografías Poppins + Inter auto-alojadas (sin CDN) e íconos PWA
  192/512 (normal y maskable) con la paleta de la app.

### Parte 1 — Libro diario
- Recuadros de Entradas, Salidas y Saldo actual, calculados en vivo.
- Formulario rápido: Fecha (hoy por defecto), Tipo (Venta/Compra/Traslado),
  Producto (buscador con opción de **crear producto nuevo** inline),
  Valor, Cantidad y Comentario, con campos que se activan/desactivan según
  el Tipo elegido.
- Registros ordenados del más reciente al más antiguo.
- Eliminar registros con confirmación.

### Parte 2 — Costo de productos
- Carga de productos por CSV (`;`), con detección de columnas por nombre.
- Agrupación visual por **Referencia**, con **Total Ref.** automático
  (suma de Costo total de sus componentes).
- **Costo total** autocalculado (Costo Unitario × Cantidad).
- **Costo Unitario** con soporte de fórmulas (`=4/2`, `+ − × ÷`, paréntesis)
  mediante un evaluador propio (sin `eval`).
- Buscador de Producto enlazado al catálogo de la Pestaña 3, con
  autocompletado de Unidad y Costo Unitario al seleccionar.
- Guardado automático de cada edición.

### Parte 3 — Productos
- Carga de productos por CSV.
- Listado editable en línea (Producto, Cantidad, Unidad, Costo Unitario)
  con guardado automático (debounced).
- Botón "+ Nuevo producto".
- Las Compras registradas en la Pestaña 1 crean/actualizan productos aquí
  automáticamente (Costo Unitario = Valor ÷ Cantidad, Cantidad acumulada).

### Decisiones de diseño documentadas en README
- "Valor" activo también para Venta (no solo Compra), para que Entradas
  pueda registrar algo.
- Creación de productos limitada a Pestaña 1 y Pestaña 3, tal como se pidió.
- Referencia/Total Ref mostrados como encabezado de grupo en vez de
  repetirse por fila, para ahorrar espacio.

### Design
- Paleta vino/blush/oro/salvia, tipografía sin serifas, interfaz plana con
  tarjetas redondeadas y mínimo de líneas duras, pensada para landscape.

## [Unreleased]
- Edición in-place de registros del Libro diario.
- Exportar a CSV/Excel.
- Historial de cambios de costo por producto.
