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
- **Gestión Familiar Multi-Cuenta:** Lleva tu álbum y el de tus hijos en el mismo dispositivo. Usa la función Súper Match Global para cruzar los datos de toda la familia con un solo código QR y maximizar los intercambios. La app asignará automáticamente las láminas a quien más las necesite.

## 🚀 Uso e Instalación

1. **Alojamiento:** Sube todos los archivos de este repositorio a un servicio gratuito como [GitHub Pages](https://pages.github.com/), [Vercel](https://vercel.com/) o [Netlify](https://www.netlify.com/). (Es obligatorio que el sitio tenga `HTTPS` para que funcione como app instalable).
2. **Instalación:** Abre la URL generada en el navegador de tu celular (Chrome o Safari). El navegador te mostrará un aviso de **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.
3. **Uso:** Ábrela desde tu menú de aplicaciones, entra a la Configuración (⚙️) para poner tu nombre o alias, ¡y comienza a registrar tus láminas!

## 📂 Estructura del Proyecto (Módulos ES6)

El código fuente (a partir de la v49) fue refactorizado y dividido en módulos independientes para garantizar su escalabilidad y fácil mantenimiento:

```text
/
├── index.html                   # Interfaz principal (UI)
├── style.css                    # Estilos, variables CSS y animaciones
├── manifest.json                # Metadatos para instalación PWA
├── sw.js                        # Service Worker (Caché offline)
├── album_names_2026_v1.csv      # 🗄️ Base de datos maestra (¡Actualiza este archivo para cambiar nombres!)
├── data.js                      # Motor de Fetch, parseo de CSV y saneamiento de datos
├── store.js                     # Gestor de Estado (Local Storage, Multi-Álbum y Migraciones)
├── match.js                     # Algoritmo matemático del Match Global Colaborativo
├── app.js                       # Controlador principal (Manejo del DOM, QR y Exportación)
└── assets/                      # (Opcional)
    ├── icon.svg                 # Ícono de la aplicación
    ├── logo_fwc.svg             # Logo oficial FIFA
    └── logo_coca_cola.svg       # Logo Coca-Cola

---

**Nota:** Para ver el detalle de las actualizaciones, mejoras y el registro histórico del desarrollo de esta aplicación, consulta el archivo [`CHANGELOG.md`](CHANGELOG.md).
