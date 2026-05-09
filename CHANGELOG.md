# Historial de Versiones (Changelog)

Todas las actualizaciones y cambios notables de la aplicación "Álbum Mundial 2026" se documentarán en este archivo.

### v12 - Solución de Espacio en Pantalla (Layout móvil)
- **Filtros deslizables (Scroll Horizontal):** Se evitó que los campos de búsqueda, botones y filtros del encabezado salten a múltiples líneas. Ahora se mantienen en una sola línea deslizable (`overflow-x: auto`), reduciendo la altura de la cabecera en móviles a la mitad.
- **Cabecera Flotante (Landscape):** Al girar el celular en formato horizontal (menor a 500px de alto), la cabecera deja de estar anclada (`position: absolute`) y se desliza hacia arriba de forma natural, otorgando el 100% de la pantalla a la navegación del álbum.

### v11 (Actual) - Estabilidad y Rompe-caché
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
- **Valid
