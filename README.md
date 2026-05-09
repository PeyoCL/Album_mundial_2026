# Álbum Mundial 2026 - Gestor de Láminas (PWA) 🏆

Aplicación Web Progresiva (PWA) totalmente estática para gestionar tu colección de láminas del Mundial 2026. Construida exclusivamente con HTML5, CSS3 y JavaScript Vanilla, sin necesidad de frameworks, bases de datos o backend. 

Los datos se guardan de forma local en tu dispositivo, y la aplicación puede ser instalada en tu teléfono o computadora para funcionar sin conexión a internet (offline).

## ✨ Características Principales

- **Dashboard Premium:** Diseño deportivo en modo oscuro con métricas en tiempo real (progreso, láminas únicas y repetidas).
- **Gestión Intuitiva:** Marca tus láminas con un solo clic. Un segundo clic las marca como repetidas.
- **Filtros Avanzados:** Búsqueda rápida por equipo, sección, grupo, o texto libre. Ordenamiento dinámico (Más/Menos completos, A-Z).
- **Match de Intercambios:** Compara tu progreso (JSON) con el de un contacto para saber exactamente qué láminas se pueden intercambiar (las que das y las que recibes).
- **Exportaciones Robustas:** Descarga tus listas de faltantes y repetidas en formato CSV (Excel) o PDF, o compártelas directamente por WhatsApp.
- **PWA (Offline-First):** Instalable en Android, iOS y Desktop. Funciona sin conexión a internet gracias a su Service Worker.
- **Privacidad Total:** Todo el progreso vive en el `localStorage` de tu navegador. Incluye opciones para exportar (backup) e importar tus datos manualmente.

## 🚀 Uso e Instalación

1. **Alojamiento:** Sube todos los archivos de este repositorio a un servicio gratuito como [GitHub Pages](https://pages.github.com/), [Vercel](https://vercel.com/) o [Netlify](https://www.netlify.com/). (Es obligatorio que el sitio tenga `HTTPS` para que funcione como app instalable).
2. **Instalación:** Abre la URL generada en el navegador de tu celular (Chrome o Safari). El navegador te mostrará un aviso de **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.
3. **Uso:** Ábrela desde tu menú de aplicaciones, entra a la Configuración (⚙️) para poner tu nombre o alias, ¡y comienza a registrar tus láminas!

## 📂 Archivos del Proyecto

- `index.html`: Estructura principal y plantillas de la interfaz.
- `style.css`: Sistema de diseño, variables CSS y diseño responsivo.
- `app.js`: Lógica de negocio, manejo del DOM, cálculo de Match y exportaciones.
- `data.js`: Base de datos estática con los grupos, selecciones y las 994 láminas.
- `sw.js`: Service worker que gestiona la caché y permite el funcionamiento offline.
- `manifest.json`: Archivo de configuración PWA (nombre, colores, comportamiento).
- `icon.svg`: Ícono vectorial adaptable para la aplicación instalada.
- `CHANGELOG.md`: Historial de versiones y registro detallado de cambios.

---

**Nota:** Para ver el detalle de las actualizaciones, mejoras y el registro histórico del desarrollo de esta aplicación, consulta el archivo [`CHANGELOG.md`](CHANGELOG.md).
