import { db, doc, setDoc, getDoc } from './firebase-config.js';
const STORAGE_KEY = 'album_mundial_2026_data';

export let globalState = {
    activeAlbumId: 'default',
    albums: {}
};

export function loadStore() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        // Migración Silenciosa: Si es el JSON viejo, lo encapsula
        if (!parsed.albums) {
            globalState.albums['default'] = {
                profile: parsed.profile || { name: 'Mi Álbum' },
                stickers: parsed.stickers || {},
                milestones: parsed.milestones || {}
            };
        } else {
            globalState = parsed;
        }
    } else {
        globalState.albums['default'] = { profile: { name: 'Mi Álbum Principal' }, stickers: {}, milestones: {} };
    }
    
    // Fallback de seguridad
    if (!globalState.albums[globalState.activeAlbumId]) {
        globalState.activeAlbumId = Object.keys(globalState.albums)[0];
    }
}

export function saveStore() {
    // 1. Siempre guardamos localmente primero (Para que la app siga siendo ultrarrápida y offline)
    localStorage.setItem('album_mundial_2026_data', JSON.stringify(globalState));
    
    // 2. Si está logueado, enviamos una copia silenciosa a la nube
    if (currentUser) {
        const userRef = doc(db, "usuarios", currentUser.uid);
        // Usamos setDoc sin "await" para no congelar la pantalla mientras sube a internet
        setDoc(userRef, globalState).catch(e => console.error("Error guardando en la nube", e));
    }
}

export function getActiveAlbum() {
    return globalState.albums[globalState.activeAlbumId];
}

export function createNewAlbum(name) {
    const id = 'album_' + Date.now();
    globalState.albums[id] = { profile: { name: name }, stickers: {}, milestones: {} };
    globalState.activeAlbumId = id;
    saveStore();
}

export function deleteActiveAlbum() {
    const keys = Object.keys(globalState.albums);
    if (keys.length <= 1) {
        alert("No puedes eliminar tu único álbum.");
        return;
    }
    if(confirm(`¿Seguro que deseas eliminar "${getActiveAlbum().profile.name}"?`)){
        delete globalState.albums[globalState.activeAlbumId];
        globalState.activeAlbumId = Object.keys(globalState.albums)[0];
        saveStore();
        window.location.reload();
    }
}

export function getFamilyNameString() {
    const names = Object.values(globalState.albums).map(a => a.profile.name);
    if (names.length === 0) return "Mi Álbum";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `Álbumes de "${names[0]}" y "${names[1]}"`;
    const last = names.pop();
    return `Álbumes de "${names.join('", "')}" y "${last}"`;
}

let currentUser = null;

// Sincroniza la nube con el almacenamiento local
export async function syncWithCloud(user) {
    currentUser = user;
    if (!user) return false;

    const userRef = doc(db, "usuarios", user.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            // Caso A: El usuario ya tiene datos en la nube. Los descargamos y sobrescribimos el teléfono.
            const cloudData = docSnap.data();
            if (cloudData.albums) {
                Object.assign(globalState, cloudData);
                // Guardamos la copia en el teléfono por si luego se queda sin internet
                localStorage.setItem('album_mundial_2026_data', JSON.stringify(globalState));
                return true; // Indica que hubo actualización desde la nube
            }
        } else {
            // Caso B: Es su primera vez iniciando sesión. Subimos sus datos locales a la nube.
            await setDoc(userRef, globalState);
        }
    } catch (e) {
        console.error("Error conectando con la nube:", e);
    }
    return false;
}