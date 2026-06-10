// store.js - VERSIÓN 100% OFFLINE DEFINITIVA
export const globalState = { albums: {}, activeAlbumId: null };

function sanitizeData() {
    if (Array.isArray(globalState.albums)) {
        const fixedAlbums = {};
        globalState.albums.forEach(a => { if (a && a.id) fixedAlbums[a.id] = a; });
        for (let k in globalState.albums) { if (isNaN(k) && globalState.albums[k]?.id) fixedAlbums[k] = globalState.albums[k]; }
        globalState.albums = fixedAlbums;
    }
    for (let id in globalState.albums) {
        let a = globalState.albums[id];
        if (!a.profile) a.profile = { name: a.name || "Mi Álbum" };
        if (Array.isArray(a.stickers)) {
            let fixedS = {};
            a.stickers.forEach(s => { if (s && s.code) fixedS[s.code] = s; });
            for (let key in a.stickers) {
                if (isNaN(key) && a.stickers[key] && typeof a.stickers[key] === 'object') {
                    fixedS[key] = a.stickers[key];
                }
            }
            a.stickers = fixedS;
        } else if (!a.stickers) { a.stickers = {}; }
    }
    if (!globalState.activeAlbumId || !globalState.albums[globalState.activeAlbumId]) {
        const keys = Object.keys(globalState.albums);
        globalState.activeAlbumId = keys.length > 0 ? keys[0] : null;
    }
}

export async function loadStore() {
    const stored = localStorage.getItem('albumStore');
    if (stored) {
        const parsed = JSON.parse(stored);
        globalState.albums = parsed.albums || {};
        globalState.activeAlbumId = parsed.activeAlbumId || null;
        sanitizeData();
    }
}

export async function saveStore() {
    sanitizeData();
    localStorage.setItem('albumStore', JSON.stringify(globalState));
}

export function getActiveAlbum() {
    sanitizeData(); if (!globalState.activeAlbumId) return null; let album = globalState.albums[globalState.activeAlbumId];
    if (window.DATA && window.DATA.TEAMS) {
        window.DATA.TEAMS.forEach(team => { team.stickers.forEach(s => { if (!album.stickers[s.code]) { album.stickers[s.code] = { have: false, count: 0 }; } }); });
    }
    return album;
}

export function createNewAlbum(name) {
    const id = 'album_' + Date.now();
    globalState.albums[id] = { id: id, name: name, profile: { name: name }, stickers: {} };
    globalState.activeAlbumId = id; saveStore();
    return getActiveAlbum();
}

export function deleteActiveAlbum() {
    if (globalState.activeAlbumId) {
        delete globalState.albums[globalState.activeAlbumId]; sanitizeData(); saveStore();
    }
}

export function getFamilyNameString() { 
    const a = getActiveAlbum(); 
    return (a && a.profile && a.profile.name) ? a.profile.name : "Mi Álbum"; 
}