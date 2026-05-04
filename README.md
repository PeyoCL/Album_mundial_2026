# Album Mundial 2026

Aplicacion web estatica para llevar el control de un album del Mundial 2026. Permite marcar laminas obtenidas, registrar repetidas, filtrar secciones y grupos, ordenar equipos, exportar listas y compartir cambios.

## Contenido del album

- 48 selecciones.
- 960 laminas de equipos.
- 20 laminas de la seccion FIFA World Cup: `00`, `FWC1` a `FWC19`.
- 14 laminas de la seccion Coca-Cola: `CC1` a `CC14`.
- Total: 994 fichas.

Las laminas de cada seleccion usan solo nomenclatura por codigo para evitar errores con nombres de jugadores. Ejemplo: Mexico usa `MEX1` a `MEX20`.

Como la nomenclatura de codigo y lamina es la misma, la interfaz y las exportaciones muestran solo el campo **Lamina**.

En todas las selecciones:

- La ficha `1` es el escudo.
- La ficha `13` es la foto del equipo.
- El resto de fichas se identifican solo por codigo.

## Funciones

- Dashboard de progreso dentro de la seccion Album.
- Busqueda por pais, seccion, grupo y lamina.
- Filtro por equipo/seccion.
- Filtro por grupo.
- Boton para borrar filtros.
- Ordenamiento por mas completos, menos completos, equipos A-Z y orden original.
- Registro de laminas obtenidas y repetidas.
- Lista de cambios agrupada por equipo o seccion.
- Texto para compartir repetidas.
- Exportacion de la lista de cambios en PDF.
- Exportacion de la lista de cambios en Excel (`.xls`).
- Descarga de la lista de fichas faltantes en Excel (`.xls`).
- Exportacion e importacion de progreso en JSON.
- Reinicio del album con confirmacion.
- Tema claro y oscuro.
- Diseno responsivo para desktop, tablet y movil.

## Grupos

| Grupo | Equipos |
| --- | --- |
| A | MEX, RSA, KOR, CZE |
| B | CAN, BIH, QAT, SUI |
| C | BRA, MAR, HAI, SCO |
| D | USA, PAR, AUS, TUR |
| E | GER, CUW, CIV, ECU |
| F | NED, JPN, SWE, TUN |
| G | BEL, EGV, IRN, NZL |
| H | ESP, CPV, KSA, URU |
| I | FRA, SEN, IRQ, NOR |
| J | ARG, ALG, AUT, JOR |
| K | POR, COD, UZB, COL |
| L | ENG, CRO, GHA, PAN |

Nombres ajustados:

- `KOR`: Korea Republic.
- `CZE`: Czechia.
- `ALG`: Algeria.

## Archivos principales

- `index.html`: estructura de la app.
- `style.css`: estilos visuales y responsivos.
- `app.js`: interaccion, filtros, progreso, exportaciones y almacenamiento local.
- `data.js`: datos de selecciones, secciones y laminas.

## Como usarlo localmente

Abre `index.html` en el navegador.

El progreso se guarda en el `localStorage` del navegador. Cada persona que use la app tendra su propio progreso en su equipo o navegador.

## Publicarlo con GitHub Pages

1. Entra al repositorio en GitHub.
2. Ve a **Settings**.
3. Abre **Pages**.
4. En **Build and deployment**, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda los cambios.

GitHub generara un enlace similar a:

```text
https://ingrid-eth.github.io/Album_mundial_2026/
```

## Prompt para recrear la aplicacion

Copia este prompt en ChatGPT, Claude, Gemini u otra herramienta si quieres recrear la misma aplicacion desde cero.

```text
Desarrolla una aplicacion web estatica llamada "Album Mundial 2026", usando solo HTML, CSS y JavaScript vanilla. No uses frameworks ni backend. Debe funcionar abriendo directamente index.html en el navegador.

La app debe permitir llevar el control de un album de fichas del Mundial 2026, marcar fichas obtenidas, registrar repetidas, filtrar por equipo y grupo, ordenar equipos, exportar listas, importar/exportar progreso y compartir cambios.

Archivos obligatorios:
- index.html
- style.css
- app.js
- data.js
- README.md

Idioma:
- Espanol.

Estilo visual:
- Tema oscuro por defecto.
- Diseno tipo dashboard deportivo premium.
- Fondo azul noche casi negro.
- Tarjetas azul oscuro.
- Acento principal dorado/amarillo.
- Acento secundario azul.
- Verde para completado.
- Bordes sutiles y sombras suaves.
- Diseno responsivo para desktop, tablet y movil.
- Usar Google Fonts: Bebas Neue para el titulo principal e Inter para el resto.

Variables CSS sugeridas:
- --bg-base: #0a0e1a
- --bg-surface: #111827
- --bg-card: #1a2235
- --bg-card-hover: #1e2a40
- --border-subtle: rgba(255,255,255,0.06)
- --border-accent: rgba(99,179,237,0.3)
- --gold: #f6c90e
- --gold-soft: rgba(246,201,14,0.15)
- --blue-accent: #3b82f6
- --green-complete: #10b981
- --text-primary: #f1f5f9
- --text-secondary: #94a3b8
- --text-muted: #475569

Estructura general:
- La aplicacion debe vivir dentro de #app.
- Debe tener canvas#confetti-canvas para celebraciones.
- Debe tener dos pestanas principales: Album y Cambios.
- No debe existir una pestana independiente de Seguimiento.
- El dashboard de seguimiento debe estar dentro de Album.

Header fijo:
- Debe estar fijo arriba con blur/backdrop.
- Debe contener titulo editable "Mi Album".
- Subtitulo: "Mundial 2026 · 48 selecciones · 994 fichas".
- Boton de tema.
- Boton de configuracion.
- Barra de busqueda.
- Filtro de equipo/seccion.
- Filtro de grupo.
- Boton "Borrar filtros".
- Contador de resultados.
- Barra de ordenamiento centrada.
- El header fijo no debe solaparse con el dashboard.
- Implementar updateHeaderOffset(), que lee header.offsetHeight y asigna --header-offset con offsetHeight + 18px.
- Implementar observeHeaderOffset(), que usa ResizeObserver sobre .app-header, recalcula cuando carguen fuentes con document.fonts.ready y recalcula en window.resize.
- En CSS usar #tab-home { padding-top: var(--header-offset); }.

Navegacion inferior:
- Solo dos botones: Album y Cambios.
- En desktop debe ser una pildora flotante centrada.
- En movil debe ocupar todo el ancho inferior.

Pestana Album:
- Debe mostrar un dashboard superior.
- Tarjeta principal con anillo circular de progreso, porcentaje grande, texto "Completado", kicker "Tu coleccion", titulo "Progreso del album", texto "Tienes X de 994 fichas unicas." y barra lineal.
- Tres tarjetas metricas: Avance, Unicas y Cambio.
- En desktop la tarjeta principal va a la izquierda y las tres metricas a la derecha.
- En pantallas medianas la tarjeta principal ocupa toda la fila y las metricas quedan debajo.
- En movil todo va en una columna.
- Debajo debe haber un grid de equipos/secciones.
- El grid debe mostrar primero FIFA World Cup, luego Coca-Cola y luego las 48 selecciones.
- Cada tarjeta muestra codigo visual, bandera o icono, nombre, progreso X/Y, porcentaje y barra de progreso.
- Al hacer clic en una tarjeta se abre un modal con sus fichas.

Filtros:
- La busqueda debe buscar por pais/equipo, seccion, grupo y lamina.
- El filtro de equipo/seccion debe incluir las secciones adicionales y todos los equipos.
- El filtro de grupo debe incluir Especiales, Coca-Cola y Grupo A a Grupo L.
- El boton "Borrar filtros" limpia busqueda, equipo/seccion y grupo.

Ordenamiento:
- Barra con: Mas completos, Menos completos, Equipos A-Z y Todos.
- Mas completos ordena por progreso descendente.
- Menos completos ordena por progreso ascendente.
- Equipos A-Z ordena alfabeticamente por nombre de equipo/seccion, no por grupo.
- Todos conserva el orden base.

Modal de detalle:
- Muestra bandera/icono, nombre, grupo o seccion, contador X/Y y grid de fichas.
- Cada ficha se marca al hacer clic.
- Si no existe en estado: have true y count 1.
- Si ya existe: incrementa count.
- Si count > 1, muestra badge +N.
- Debe tener boton menos para restar.
- Si count baja a 0, queda no obtenida.
- Las fichas obtenidas se ven en verde.
- Las fichas especiales se ven con dorado.
- Debe haber animacion sutil al marcar y particulas al marcar por primera vez.

Datos del album:
- Total general: 994 fichas.
- 48 selecciones.
- 960 fichas de equipos.
- 34 fichas adicionales.

Secciones adicionales:
- FIFA World Cup: code FWC, name FIFA World Cup, icon FWC, group Especiales. Fichas: 00, FWC1, FWC2, FWC3, FWC4, FWC5, FWC6, FWC7, FWC8, FWC9, FWC10, FWC11, FWC12, FWC13, FWC14, FWC15, FWC16, FWC17, FWC18, FWC19.
- Coca-Cola: code CC, name Coca-Cola, icon CC, group Coca-Cola. Fichas: CC1, CC2, CC3, CC4, CC5, CC6, CC7, CC8, CC9, CC10, CC11, CC12, CC13, CC14.

Reglas de nomenclatura:
- No usar nombres de jugadores en las fichas.
- Usar solo nomenclatura por codigo.
- Ejemplo Mexico: MEX1 a MEX20.
- En todas las selecciones, ficha 1 = escudo y ficha 13 = foto del equipo.
- Las demas fichas son genericas por codigo.
- Como codigo y lamina son iguales, en interfaz y exportaciones mostrar solo "Lamina".
- Internamente se puede usar code como llave para guardar estado.

Funcion makeTeam(code, name, flag, group, debutant, players):
- Debe ignorar jugadores para generar fichas.
- Debe crear exactamente 20 fichas.
- Si numero = 1: code `${code}1`, name `${code}1`, type `shield`.
- Si numero = 13: code `${code}13`, name `${code}13`, type `group`.
- Resto: code `${code}${number}`, name `${code}${number}`, type `sticker`.

Grupos oficiales:
- Grupo A: MEX Mexico, RSA Sudafrica, KOR Korea Republic, CZE Czechia.
- Grupo B: CAN Canada, BIH Bosnia y Herzegovina, QAT Qatar, SUI Suiza.
- Grupo C: BRA Brasil, MAR Marruecos, HAI Haiti, SCO Escocia.
- Grupo D: USA Estados Unidos, PAR Paraguay, AUS Australia, TUR Turquia.
- Grupo E: GER Alemania, CUW Curazao, CIV Costa de Marfil, ECU Ecuador.
- Grupo F: NED Paises Bajos, JPN Japon, SWE Suecia, TUN Tunez.
- Grupo G: BEL Belgica, EGV Egipto, IRN Iran, NZL Nueva Zelanda.
- Grupo H: ESP Espana, CPV Cabo Verde, KSA Arabia Saudita, URU Uruguay.
- Grupo I: FRA Francia, SEN Senegal, IRQ Irak, NOR Noruega.
- Grupo J: ARG Argentina, ALG Algeria, AUT Austria, JOR Jordania.
- Grupo K: POR Portugal, COD R.D. del Congo, UZB Uzbekistan, COL Colombia.
- Grupo L: ENG Inglaterra, CRO Croacia, GHA Ghana, PAN Panama.

Objeto GROUPS obligatorio:
const GROUPS = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGV', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

Banderas flagcdn:
- MEX mx, RSA za, KOR kr, CZE cz
- CAN ca, BIH ba, QAT qa, SUI ch
- BRA br, MAR ma, HAI ht, SCO gb-sct
- USA us, PAR py, AUS au, TUR tr
- GER de, CUW cw, CIV ci, ECU ec
- NED nl, JPN jp, SWE se, TUN tn
- BEL be, EGV eg, IRN ir, NZL nz
- ESP es, CPV cv, KSA sa, URU uy
- FRA fr, SEN sn, IRQ iq, NOR no
- ARG ar, ALG dz, AUT at, JOR jo
- POR pt, COD cd, UZB uz, COL co
- ENG gb-eng, CRO hr, GHA gh, PAN pa

Estado:
- Usar localStorage.
- Key: album_mundial_2026_data.
- Estado inicial: profile { name: 'Mi Album', photo: null }, stickers {}, lastUpdated Date.now().
- Migrar progreso viejo con codigos tipo MEX-01 a MEX1, sumando counts si dos codigos migran al mismo destino.

Pestana Cambios:
- Mostrar total de repetidas.
- Lista agrupada por equipo/seccion.
- Cada fila debe mostrar Lamina y Cantidad repetida.
- No mostrar columna Codigo.
- Botones: Compartir lista, Exportar PDF, Exportar Excel y Descargar faltantes.
- Los botones de cambios se deshabilitan si no hay repetidas.
- Descargar faltantes se deshabilita si el album esta completo.

Compartir lista:
- Abrir modal con textarea readonly.
- Incluir nombre del album, coleccionista, progreso y repetidas.
- En repetidas mostrar solo lamina y cantidad.
- Boton copiar.

Exportaciones:
- Cambios Excel: archivo cambios_album_mundial_2026.xls, columnas Seccion, Lamina, Repetidas.
- Faltantes Excel: archivo faltantes_album_mundial_2026.xls, columnas Seccion, Lamina.
- Cambios PDF: archivo cambios_album_mundial_2026.pdf con titulo, coleccionista, progreso, total de repetidas y lista de Seccion, Lamina, Repetidas.
- No incluir columna Codigo.

Configuracion:
- Modal con exportar datos JSON, importar datos JSON y reiniciar album.
- Exportar JSON descarga album_mundial_2026.json.
- Importar JSON restaura estado.
- Reiniciar muestra confirmacion, borra state.stickers y borra hitos.

Tema:
- Oscuro por defecto.
- Claro opcional.
- Guardar preferencia en album_theme_2026.

Celebraciones:
- Hitos 25%, 50%, 75% y 100%.
- Al alcanzar hito mostrar modal y lanzar confetti.
- Al completar equipo/seccion mostrar celebracion.
- Usar canvas para confetti.

Funciones principales obligatorias:
loadState, migrateStickerCodes, saveState, getStickerState, toggleSticker, decrementSticker, getHaveCount, getTeamProgress, getTotalProgress, getRepeatedList, getRepeatedTotal, getMissingList, renderHome, renderDashboardCards, renderTeamsGrid, makeTeamCard, applyCollectionSearch, clearFilters, populateTeamFilter, populateGroupFilter, makeStickerCard, updateTeamCount, updateHomeProgress, renderTrades, renderRepeated, updateTradeExportButtons, updateMissingExportButton, generateShareText, getTradeExportRows, getMissingExportRows, exportTradesPdf, exportTradesExcel, exportMissingExcel, openTeamDetail, showModal, closeModal, exportData, importData, resetAlbum, confirmReset, toggleTheme, loadTheme, updateHeaderOffset, observeHeaderOffset, init.
```
