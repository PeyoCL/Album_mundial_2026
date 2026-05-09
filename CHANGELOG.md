# Historial de Versiones (Changelog)

Todas las actualizaciones y cambios notables de la aplicación "Álbum Mundial 2026" se documentarán en este archivo.

### v15 - Precisión en Porcentajes (Bugfix)
- **Corrección de Redondeo:** Se corrigió un error matemático donde la barra de progreso general y de equipo podía redondear a 100% prematuramente (ej. 991/994 láminas daba 99.7% = 100%). Ahora, el progreso de la colección está limitado de forma condicional: si no tienes exactamente todas las láminas, jamás mostrará el 100% ni lanzará las celebraciones antes de tiempo.

### v14 - Corrección Completa de Codificación en Exportaciones CSV
- **Excel en Español:** Se cambió el delimitador de las columnas exportadas de coma (`,`) a punto y coma (`;`). Esto evita que Excel en sistemas configurados en español (que usan la coma para decimales) agrupe todas las columnas en una sola.
- **BOM en UTF-8 nativo:** Se incluyó el marcador `\uFEFF` directamente en el string base del archivo JavaScript al exportar. Esto garantiza que todos los sistemas operativos (Windows/Mac) rendericen perfectamente los acentos y caracteres especiales.

### v13 - Optimización JSON de Intercambio (Match)
- **Minificación de Payload:** Se rediseñó la función de copia de datos al portapapeles. Ahora genera un formato ultra comprimido (`{"n": "Nombre", "s": {"MEX1": 2}}`), filtrando láminas faltantes, propiedades inútiles y el historial. Esto reduce el peso del texto de 45KB a ~10KB, evitando que teléfonos o la app de WhatsApp trunquen el mensaje por límite de caracteres.
- **Retrocompatibilidad:** La lógica del sistema Match ahora puede interpretar tanto el nuevo formato minimizado (v13+) como el antiguo formato completo de la app (v12-).

### v12 - Solución de Espacio en Pantalla (Layout móvil)
- **Filtros deslizables (Scroll Horizontal):** Se evitó que los campos de búsqueda, botones y filtros del encabezado salten a múltiples líneas. Ahora se mantienen en una sola línea deslizable (`overflow-x: auto`), reduciendo la altura de la cabecera en móviles a la mitad.
- **Cabecera Flotante (Landscape):** Al girar el celular en formato horizontal (menor a 500px de alto), la cabecera deja de estar anclada (`position: absolute`) y se desliza hacia arriba de forma natural, otorgando el 100% de la pantalla a la navegación del álbum.

### v11 - Estabilidad y Rompe-caché
- **Cache Busting:** Se añadieron parámetros `?v=11` en los enlaces de `style.css` y `app.js` en el HTML principal para forzar a los navegadores móviles a descargar siempre la última versión, ignorando cachés atascados.
- **Protección Anti-Crash:** Se reescribió la función de inicio (`init()`) con programación defensiva (`try/catch`) para garantizar que la interfaz y los menús de navegación sigan funcionando incluso si los datos guardados (`localStorage`) en el dispositivo se corrompen.

### v10 - Corrección Estructural
- **Reestructuración limpia:** Se corrigieron etiquetas HTML mal cerradas y estilos corruptos que causaban que la interfaz "se quebrara" o se perdiera la responsividad de las pestañas inferiores. 
- **Consolidación de código:** Se entregó una base de código fuente revisada e íntegra para asegurar que la PWA se renderice perfectamente tanto en móvil como en escritorio.

### v9 - Corrección de Codificación en Exportaciones CSV
- **UTF-8 estricto para Excel:** Inyección del *Byte Order Mark* (BOM `0xEF, 0xBB, 0xBF`) al generar los archivos CSV en Javascript para que Microsoft Excel (y Windows en general) reconozca de manera nativa y directa caracteres especiales como tildes (ej: "Haití", "Turquía") en las listas exportadas.

### v8 - Inclusividad y Mejoras UX
- **Refactorización de lenguaje:** Textos adaptados para usar lenguaje inclusivo y neutro en la sección Match ("tu contacto", "amigo o amiga").
- **UX mejorado en Match:** Se agregó un botón "Limpiar texto" para resetear los resultados del intercambio rápidamente y poder pegar un nuevo código JSON de otra persona.
- **Forzado de Caché:** Actualización del Service Worker para forzar a los dispositivos a tomar los últimos cambios de diseño.

### v7 - Personalización e Identidad
- **Alias de usuario:** Nuevo campo en "Configuración" para definir el Nombre o Alias del coleccionista.
- **Sincronización:** El nombre se refleja dinámicamente en el título de la cabecera y en los reportes de intercambio.
- **Recordatorio inteligente:** La app ahora alerta si intentas copiar tus datos para hacer Match usando el nombre por defecto ("Mi Álbum"), pidiendo tu nombre real para que la otra persona te identifique fácilmente.

### v6 - Sistema de Match y Exportación Optimizada
- **Validar Intercambio (Match):** Nueva pestaña principal dedicada a cruzar tu código JSON con el de un contacto. Calcula automáticamente dos listas: "Láminas que le puedo dar" y "Láminas que me puede dar".
- **Integración WhatsApp:** Botón para enviar el resumen del Match directamente al chat de la otra persona.
- **Exportación en línea única:** Las listas PDF, CSV y de texto ahora agrupan las repetidas/faltantes en una sola línea por país (ej. `México: 1(x2), 4, 15`), reduciendo drásticamente el tamaño del documento.

### v5 - Indicador de Versión
- **Versionado visible:** Se añadió un indicador sutil (`v5`, `v6`, etc.) en la cabecera junto al contador de láminas para ayudar a los usuarios a confirmar que su PWA se actualizó correctamente en segundo plano.

### v4 - Soporte Landscape
- **Giro de pantalla destrabado:** Eliminación de la restricción `portrait` en el `manifest.json`.
- **Media Queries dinámicos:** El menú de navegación inferior ahora se adapta a modo barra en pantallas horizontales (Landscape) para no obstruir el contenido visual.
- **Recálculo de offsets:** Implementación de un evento `orientationchange` para que el espaciado de la cabecera se reajuste al instante al girar el celular.

### v3 - Correcciones Visuales y Nativas
- **Fix Multilínea:** Se ajustó el CSS para que los nombres largos de los países (Ej. "Bosnia y Herzegovina") hagan salto de línea sin romper la tarjeta del equipo.
- **Íconos SVG:** Se cambió el emoji del vaso de refresco por un ícono vectorial de botella dorada para la sección Coca-Cola.
- **Fix Exportación Excel:** Se cambió la generación de `.xls` puro a formato universal CSV delimitado por comas, solucionando advertencias de archivo corrupto en Excel.
- **Fix Exportación PDF:** Migración del generador PDF. Ahora usa un iframe invisible en lugar de `window.open`, evitando que los bloqueadores de ventanas emergentes de iOS y Android impidieran la descarga.

### v2 - PWA y Nomenclatura
- **Progressive Web App:** Creación de `manifest.json`, Service Worker (`sw.js`) con limpieza automática de caché antigua y reemplazo de iconos PNG por un `icon.svg` escalable de alto rendimiento.
- **Corrección de contexto:** Cambio global de la palabra "Fichas" a "Láminas" en toda la interfaz de usuario y alertas.

### v1 - Lanzamiento Inicial
- Versión base de la aplicación.
- Implementación de estado con `localStorage`.
- Dashboard responsivo, listado de 48 selecciones y especiales (994 láminas).
- Filtros por equipo/grupo/texto, ordenamientos dinámicos, gestión de repetidas y animaciones de `canvas` para celebraciones (Confetti).
