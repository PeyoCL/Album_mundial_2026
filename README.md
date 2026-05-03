# Album Mundial 2026

Aplicacion web estatica para llevar el control de un album del Mundial 2026. Permite marcar laminas obtenidas, registrar repetidas, filtrar secciones y compartir la lista de cambios.

## Contenido del album

- 48 selecciones.
- 960 laminas de equipos.
- 20 laminas de la seccion FIFA World Cup: `00`, `FWC1` a `FWC19`.
- 14 laminas de la seccion Coca-Cola: `CC1` a `CC14`.
- Total: 994 fichas.

## Funciones

- Dashboard de progreso dentro de la seccion Album.
- Busqueda por pais, seccion, grupo, codigo de lamina, nombre y posicion.
- Filtros por equipo/seccion y posicion.
- Boton para borrar filtros.
- Registro de laminas obtenidas y repetidas.
- Lista de cambios agrupada por equipo o seccion.
- Texto para compartir repetidas.
- Exportacion e importacion de progreso en JSON.
- Reinicio del album con confirmacion.
- Tema claro y oscuro.
- Diseno responsivo para desktop, tablet y movil.

## Archivos principales

- `index.html`: estructura de la app.
- `style.css`: estilos visuales y responsivos.
- `app.js`: interaccion, filtros, progreso y almacenamiento local.
- `data.js`: datos de selecciones, secciones y laminas.

## Como usarlo localmente

Abre `index.html` en el navegador.

El progreso se guarda en el `localStorage` del navegador. Cada persona que use la app tendra su propio progreso en su equipo o navegador.

## Como compartirlo

Puedes compartir el repositorio:

```text
https://github.com/Ingrid-eth/Album_mundial_2026
```

Otra persona puede descargarlo desde GitHub con **Code > Download ZIP**, descomprimirlo y abrir `index.html`.

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

## Guardar cambios en GitHub

Despues de modificar archivos:

```bash
git add .
git commit -m "Descripcion del cambio"
git push
```
