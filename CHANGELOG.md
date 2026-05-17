# Historial de Versiones (Changelog)

Todas las actualizaciones y cambios notables de la aplicación "Álbum Mundial 2026" se documentarán en este archivo.

### v37 - Logotipos Oficiales en Secciones Especiales
- **Branding Premium:** Se reemplazaron los emojis genéricos en las cabeceras de las secciones "FIFA World Cup" (🏆) y "Coca-Cola" (🍼) por sus logotipos oficiales en formato SVG (`logo_fwc.svg` y `logo_coca_cola.svg`).
- **Renderizado Anti-Deformación:** Se actualizó la lógica de creación de tarjetas en `app.js` para detectar archivos SVG e implementar la propiedad CSS `object-fit: contain`. Esto garantiza que los logotipos mantengan sus proporciones originales sin estirarse ni aplastarse, independientemente de si son verticales u horizontales, ajustándose elegantemente al espacio de la cabecera. Se añadió un ligero efecto de sombra (`drop-shadow`) al logo blanco de la FWC para mejorar su visibilidad.

### v36 - Cruce de Datos Perfecto (Hex Bitmask)
- **Corrección Lógica de Intercambios ("Te entrego"):** Se solucionó el falso positivo del algoritmo de Match. En versiones anteriores, al compartir solo las láminas repetidas, la app asumía erróneamente que a la otra persona le faltaban todas las demás láminas del álbum, inflando la lista de "Te puedo dar". 
- **Compresión de Mapa de Bits (Bitmask):** Para no saturar el Código QR con miles de caracteres indicando las láminas faltantes, se implementó una función matemática que convierte los 994 espacios del álbum en un código binario (1=falta, 0=tiene) y lo comprime en una diminuta cadena Hexadecimal de 249 caracteres (atributo `"m"`). Esto permite reconstruir el álbum completo del amigo con 100% de precisión y calcular las láminas a entregar de forma exacta.
- **Backwards Compatibility:** Se agregó compatibilidad hacia atrás. Si un usuario con la v36 lee un código QR generado por una app vieja (v35 o inferior que no incluye el mapa de bits), la app realizará el cálculo utilizando la lógica antigua y mostrará una advertencia roja en pantalla pidiéndole al amigo que actualice su app para mayor precisión.

### v35 - Corrección de Exportaciones (PDF y Google Sheets)
- **Fix Google Sheets:** Se eliminó el "Byte Order Mark" (BOM) en las descargas CSV. Como la app ya sanitiza dinámicamente las tildes para evitar rupturas de codificación, el BOM era redundante y causaba que Google Sheets mostrara caracteres extraños (`ï»¿`) al inicio del archivo. Ahora los datos son interpretados de manera nativa y limpia.
- **Fix de Iframe PDF:** Se solucionó un problema de asincronía en el navegador donde la primera exportación a PDF imprimía el Dashboard completo en lugar de la tabla. Se aumentó el `setTimeout` y se gestionó mejor el enfoque (`focus()`) del contexto de ventana para que la orden de impresión siempre apunte al documento invisible.

### v34 - Arquitectura "Lazy Load" y Prevención de Bloqueos (Anti-Crash)
- **Carga Diferida de Librerías (Lazy Loading):** Se eliminaron por completo las llamadas a scripts externos desde la cabecera del `index.html`. Ahora la aplicación carga a la máxima velocidad y es 100% inmune a "pantallas blancas" o cuelgues iniciales. Las herramientas de generación y lectura de códigos QR solo se descargan y ejecutan en el milisegundo en el que el usuario interactúa con los botones correspondientes.
- **Estabilidad Estructural:** Se optimizó el Service Worker y se consolidó el código fuente en bloques más seguros para evitar errores de sintaxis al actualizar los archivos, garantizando una experiencia de arranque fluida incluso en redes inestables o navegadores con fuertes bloqueadores de anuncios.

### v33 - Restauración de Escáner por Cámara
- **Lector Dual:** Se reincorporó la funcionalidad de `html5-qrcode` para permitir abrir la cámara en vivo ("Escanear Cámara"). Ahora la aplicación soporta lectura Dual: la cámara en vivo para códigos QR rápidos/sencillos, y la decodificación por "Subida de Foto" con `jsQR` como respaldo para QRs de alta densidad o capturas de pantalla de WhatsApp.

### v32 - Integración Visual de Logo Oficial
- **Rebranding UI:** Se añadió el logo oficial del Mundial 2026 en el header de la aplicación, directamente integrado junto al título de "Mi Álbum". Esto dota a la PWA de un aspecto mucho más inmersivo y oficial, reemplazando la cabecera genérica de puro texto.
- **Actualización de Ícono Base:** El archivo `icon.svg` a nivel del sistema fue reemplazado, logrando que al instalar la aplicación en el home del dispositivo móvil, se muestre el escudo real del mundial.

### v31 - Corrección de Diseño (Responsive QR Modal)
- **Bloqueo de Descuadre UI:** Al generar códigos QR de alta definición (800x800px), la ventana modal se deformaba empujando el botón de descarga fuera de la pantalla. Se cambió la arquitectura de renderizado: ahora el QR se procesa como una URL de datos (`DataURL`) en segundo plano y se inyecta en una etiqueta `<img>` con restricciones de CSS (`max-width: 250px`). Esto garantiza que el diseño visual se mantenga perfectamente encuadrado sin sacrificar la resolución HD del archivo al momento de descargarlo.

### v30 - Generación de Código QR en Alta Definición (HD)
- **Corrección de Anti-aliasing:** Se solucionó el error de "pixelado gris" que ocurría al generar códigos QR con más de 100 láminas. Ahora, la aplicación genera el QR internamente en Alta Definición (800x800 píxeles), forzando a que cada cuadro del QR sea un bloque de píxeles enteros, garantizando un alto contraste para los escáneres.
- **Lector jsQR optimizado:** Se ajustó la función de escaneo para procesar imágenes con algoritmos agresivos (`inversionAttempts: attemptBoth`), permitiendo decodificar imágenes directamente desde la galería fotográfica del celular sin perder nitidez.

### v29 - Decodificación de QR Densa
- **Migración a jsQR:** Se reemplazó la librería de lectura de QR `html5-qrcode` por `jsQR`. Esta nueva librería es capaz de descifrar la matriz de píxeles directamente desde el binario de la imagen cargada, lo cual resuelve el fallo de "No se detectó un código QR" que ocurría con imágenes extremadamente densas (es decir, usuarios con cientos de láminas repetidas).
- **Escalado Inteligente:** Antes de leer el QR, la app ahora redimensiona la imagen de manera invisible a un tamaño manejable (1000px). Esto mantiene un alto contraste para facilitar la lectura y previene que navegadores móviles con poca memoria RAM colapsen.

### v28 - Descarga de Código QR
- **Guardar en Galería:** Se añadió un botón en el modal del código QR que permite descargar la imagen generada (`.png`) directamente al dispositivo del usuario. El archivo se nombra automáticamente de forma dinámica usando el nombre o alias configurado en el perfil (ej. `QR_Album_2026_Juan_Perez.png`), facilitando el envío de este código como foto por redes sociales y aplicaciones de mensajería.

### v27 - Descarga Resiliente de Códigos QR
- **Protección contra Bloqueadores:** Se implementó una función asíncrona (`loadQRLibraries()`) que permite inyectar forzosamente los scripts necesarios para la generación y escaneo de Códigos QR incluso si el proveedor original falla. Si un usuario experimenta un bloqueo por caché antiguo o por AdBlock, la aplicación intercepta el error, descarga la herramienta en segundo plano e intenta ejecutar la función nuevamente de forma automática.
- **Transición a CDNJS:** Se cambió el proveedor de librerías externas a `cdnjs.cloudflare.com`, que tiene menos restricciones corporativas de firewall en comparación con `unpkg.com`.

### v26 - Auto-reparación del Generador QR y SW (Anti-Crash)
- **Carga Inyectada de Librerías:** Si un dispositivo quedó estancado en una versión vieja del HTML por culpa de la caché y no encuentra las librerías QR en la cabecera, `app.js` ahora es capaz de detectarlo e inyectar forzosamente los scripts externos al hacer clic en los botones.
- **Service Worker "Stale-While-Revalidate":** Se quitó la obligación de cachear las librerías CDN durante la instalación. Esto previene un bug gravísimo donde un bloqueador de anuncios (AdBlock) o CORS denegaban el acceso al script del QR, provocando que la PWA abortara la actualización completa de toda la aplicación.
- **Control de Densidad QR:** Se agregó un límite de 2000 caracteres al generador. Si tienes cientos de repetidas y sobrepasas la capacidad física del `<canvas>`, la app lo intercepta y muestra una alerta recomendando usar "Copiar Texto", evitando el colapso silencioso de la UI.

### v25 - Optimización de QR y Auto-Actualización de Caché
- **Maximización del Código QR:** Se ajustó el nivel de corrección de errores del generador QR al nivel más bajo (`errorCorrectionLevel: 'L'`) para permitir que quepa la máxima cantidad posible de láminas. Además, se agregó un "escudo de seguridad": si tienes cientos de repetidas y sobrepasas el límite físico absoluto de datos que un QR puede dibujar, la app ya no se congelará en silencio, sino que te mostrará una alerta indicándote que utilices la opción de "Copiar Texto".
- **Caché Inteligente (Stale-While-Revalidate):** Se reescribió por completo la estrategia del Service Worker. A partir de ahora, la app cargará instantáneamente desde el caché, pero en segundo plano buscará silenciosamente si hay actualizaciones en GitHub. Esto garantiza que nunca más te quedes atascado en una versión vieja de la aplicación.

### v24 - Resumen Matemático de Intercambios
- **Calculadora de Match:** La pantalla de validación de intercambios ahora cuenta cada lámina individual y muestra un "Resumen del Match" en la parte superior.
- **Identificador de Límite:** Calcula matemáticamente el número máximo de intercambios posibles, indicando claramente entre paréntesis cuál de las dos partes tiene menos láminas para ofrecer y limita la operación (Ej: "Máx. cambios: 5 (Menos repetidas: Amigo)"). Este resumen también se exporta en el texto para WhatsApp.

### v23 - Intercambio por QR y Reactividad en Tiempo Real
- **Sistema de Códigos QR (Offline):** Se integraron las librerías `qrcode.js` y `html5-qrcode` (cacheadas vía Service Worker para funcionar sin internet). Ahora puedes generar un QR con tus láminas repetidas para que un amigo lo escanee físicamente con la cámara de su celular, o subir una captura de pantalla del QR enviada por WhatsApp para hacer el cruce de datos al instante.
- **Estadísticas Reactivas:** Se optimizó la función `updateHomeProgress()`. Ahora, en el momento exacto en que sumas o restas una lámina en el modal, el anillo de progreso general, las barras y los contadores del panel principal (Dashboard) se actualizan en vivo en segundo plano sin requerir recargar la página.

### v22 - Soporte Nativo de Instalación para iOS
- **Detección Inteligente de Safari:** Se agregó un script que detecta si el usuario está abriendo la aplicación desde un dispositivo iOS (iPhone/iPad) a través de Safari, y si no está en modo "Standalone" (instalada).
- **Guía Visual de Instalación:** Al detectar iOS, se muestra una ventana flotante discreta en la parte inferior explicando al usuario el proceso manual de Apple ("Compartir" > "Añadir a la pantalla de inicio"), incluyendo un ícono vectorial idéntico al nativo de iOS para facilitar su uso.

### v21 - Estandarización Universal de CSV (Anti-Encoding)
- **Normalización de Tildes:** Al descargar archivos CSV de Faltantes o Repetidas, la app ahora remueve dinámicamente los acentos y tildes (`México` → `Mexico`) **solamente** en el archivo exportado (en la pantalla se siguen viendo perfectos). Esta es la única forma garantizada de que Google Sheets, Excel, Apple y Android abran el archivo sin romper la codificación de caracteres, independientemente de la configuración de región o idioma del celular.

### v20 - Integración Fuerte UTF-8 y Botón de Limpieza
- **Inyección de Bytes (TextEncoder):** Se abandonó la concatenación de strings para exportaciones CSV, migrando al uso de `TextEncoder` y `Uint8Array`. Al convertir el CSV a bytes y adjuntar el BOM `0xEF, 0xBB, 0xBF` directo a nivel de memoria, se fuerza a los navegadores móviles a guardar un archivo UTF-8 inmaculado, resolviendo 100% los caracteres extraños en Google Sheets.
- **Herramienta "Anti-Caché":** Se añadió un botón de rescate llamado "Forzar Actualización (Limpiar Caché)" dentro de Configuración. Este botón borra a la fuerza el almacenamiento del Service Worker y recarga la PWA pasando parámetros aleatorios en la URL para evitar quedarse atrapado en versiones viejas.

### v19 - Corrección estricta de Codificación para Google Sheets
- **TextEncoder (A prueba de balas):** Se eliminó la inyección de BOM mediante strings que los navegadores móviles a veces ignoran. Ahora el texto CSV se compila a un `Uint8Array` usando `TextEncoder` y el BOM se inyecta directamente a nivel de bytes en memoria antes de guardar el Blob.
- **Formato universal:** Esto garantiza que el archivo generado sea detectado como un UTF-8 real por Google Sheets (separado por comas) y Excel, sin perder ni corromper jamás las tildes.

### v18 - Compatibilidad Absoluta CSV (Google Sheets)
- **Corrección de delimitador:** Se regresó el separador del archivo de exportación de CSV a la coma estándar (`,`). Esto permite que plataformas modernas en la nube, particularmente **Google Sheets**, dividan las columnas automáticamente al importar sin importar el idioma del sistema.
- **BOM Puro Integrado:** Se ajustó la inyección del marcador de bytes UTF-8 (BOM `0xEF, 0xBB, 0xBF`) usando `Uint8Array` directo en la memoria del Blob final. Esto asegura que al abrirse también en Microsoft Excel en español se mantengan todos los acentos (á, é, í) intactos.

### v17 - Formato de Nomenclatura
- **Visualización de códigos:** A petición, se cambió el formato genérico de "Lám. 1" para mostrar el código completo de la lámina incluyendo la abreviatura del equipo y un espacio (ej: "MEX 1", "FWC 12"), tanto en la cuadrícula del álbum como en las exportaciones y en la sección Match.

### v16 - Estilos de Láminas Especiales
- **Láminas de equipo (1 y 13):** Se aplicó correctamente la decoración dorada (borde, fondo y texto) a las láminas tipo Escudo (1) y Foto de Equipo (13), para diferenciarlas visualmente del resto de láminas genéricas según las reglas iniciales de la colección.

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
