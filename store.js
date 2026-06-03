// store.js - Gestor de Estado y Multi-Álbum
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
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