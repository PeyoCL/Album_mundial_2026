# Historial de Versiones (Changelog)

Todas las actualizaciones y cambios notables de la aplicación "Álbum Mundial 2026" se documentarán en este archivo.

### v10 (Actual) - Corrección Estructural
- **Reestructuración limpia:** Se corrigieron etiquetas HTML mal cerradas y estilos corruptos que causaban que la interfaz "se quebrara" o se mostrara en blanco al actualizar. 
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
- **Progressive Web App:** Creación de
