// store.js - Sincronización Real-Time con Escudo Anti-Interrupciones (v71)
import { db, doc, setDoc, getDoc, updateDoc, onSnapshot, auth } from './firebase-config.js?v=71';

export const globalState = { albums: {}, activeAlbumId: null, friendCode: null };
export let lastLocalWriteTime = 0; // Temporizador del Escudo

function sanitizeData() {
    let repairNeeded = false;
    if (Array.isArray(globalState.albums)) {
        const fixedAlbums = {};
        globalState.albums.forEach(a => { if (a && a.id) fixedAlbums[a.id] = a; });
        for (let k in globalState.albums) { if (isNaN(k) && globalState.albums[k]?.id) fixedAlbums[k] = globalState.albums[k]; }
        globalState.albums = fixedAlbums;
        repairNeeded = true;
    }
    for (let id in globalState.albums) {
        let a = globalState.albums[id];
        if (!a.profile) a.profile = { name: a.name || "Mi Álbum" };
        if (Array.isArray(a.stickers)) {
            let fixedS = {};
            a.stickers.forEach(s => { if (s && s.code) fixedS[s.code] = s; });
            
            // 🔥 RESCATE VITAL: Recuperar las láminas invisibles que se guardaron mal en la nube
            for (let key in a.stickers) {
                if (isNaN(key) && a.stickers[key] && typeof a.stickers[key] === 'object') {
                    fixedS[key] = a.stickers[key];
                }
            }
            a.stickers = fixedS;
            repairNeeded = true;
        } else if (!a.stickers) { a.stickers = {}; }
    }
    if (!globalState.activeAlbumId || !globalState.albums[globalState.activeAlbumId]) {
        const keys = Object.keys(globalState.albums);
        globalState.activeAlbumId = keys.length > 0 ? keys[0] : null;
    }
    return repairNeeded; // Avisa si encontró errores para curar la nube
}

export async function loadStore() {
    const stored = localStorage.getItem('albumStore');
    if (stored) {
        const parsed = JSON.parse(stored);
        globalState.albums = parsed.albums || {};
        globalState.activeAlbumId = parsed.activeAlbumId || null;
        globalState.friendCode = parsed.friendCode || null;
        sanitizeData();
    }
}

export async function saveStore() {
    sanitizeData();
    localStorage.setItem('albumStore', JSON.stringify(globalState));
}

export async function fullCloudBackup(user) {
    if (!user) return;
    sanitizeData();
    const docRef = doc(db, 'usuarios', user.uid);
    await setDoc(docRef, { albums: globalState.albums, activeAlbumId: globalState.activeAlbumId, friendCode: globalState.friendCode || null }, { merge: true });
    uploadToPublicBox(user);
}

export async function saveStickerToCloud(user, albumId, stickerCode, stickerData) {
    if (!user) return;
    lastLocalWriteTime = Date.now(); // 🛡️ Activa el Escudo Anti-Interrupciones
    const docRef = doc(db, 'usuarios', user.uid);
    try {
        await updateDoc(docRef, { [`albums.${albumId}.stickers.${stickerCode}`]: stickerData });
        uploadToPublicBox(user); 
    } catch (e) {
        if(e.code === 'not-found') await fullCloudBackup(user);
    }
}

let cloudUnsubscribe = null;
export function startRealTimeSync(user, onDataUpdated) {
    if (!user) { if (cloudUnsubscribe) { cloudUnsubscribe(); cloudUnsubscribe = null; } return; }

    const docRef = doc(db, 'usuarios', user.uid);
    cloudUnsubscribe = onSnapshot(docRef, (docSnap) => {
        // Ignora el eco instantáneo local para que la pantalla no parpadee
        if (docSnap.metadata.hasPendingWrites) return;

        if (docSnap.exists()) {
            const data = docSnap.data();
            globalState.albums = data.albums || {};
            globalState.activeAlbumId = data.activeAlbumId || globalState.activeAlbumId;
            globalState.friendCode = data.friendCode || globalState.friendCode;
            
            let wasCorrupted = sanitizeData();
            localStorage.setItem('albumStore', JSON.stringify(globalState));
            
            // Si la base de datos estaba rota (Array), manda el antídoto y la cura para siempre
            if (wasCorrupted) fullCloudBackup(user); 

            // 🛡️ ESCUDO: Solo redibuja la pantalla si no has tocado nada en los últimos 2 segundos
            if (Date.now() - lastLocalWriteTime > 2000) {
                if (onDataUpdated) onDataUpdated();
            }
        } else {
            fullCloudBackup(user);
        }
    }, (error) => { console.error("Error en sincronización en vivo:", error); });
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
    if (auth && auth.currentUser) fullCloudBackup(auth.currentUser);
    return getActiveAlbum();
}

export function deleteActiveAlbum() {
    if (globalState.activeAlbumId) {
        delete globalState.albums[globalState.activeAlbumId]; sanitizeData(); saveStore();
        if (auth && auth.currentUser) fullCloudBackup(auth.currentUser);
    }
}

export function getFamilyNameString() { 
    const a = getActiveAlbum(); 
    return (a && a.profile && a.profile.name) ? a.profile.name : "Mi Álbum"; 
}

export async function claimFriendCode(user, desiredCode) {
    if (!user) throw new Error("Inicia sesión para crear tu código.");
    const cleanCode = desiredCode.trim().toUpperCase().replace(/\s+/g, '');
    if (cleanCode.length < 3) throw new Error("El código debe tener al menos 3 letras o números.");
    const codeRef = doc(db, 'codigos_reservados', cleanCode); const codeSnap = await getDoc(codeRef);
    if (codeSnap.exists()) {
        if (codeSnap.data().uid === user.uid) { globalState.friendCode = cleanCode; await fullCloudBackup(user); return cleanCode; } 
        else { throw new Error("Este código ya está en uso. ¡Prueba con otro!"); }
    }
    await setDoc(codeRef, { uid: user.uid });
    globalState.friendCode = cleanCode;
    await fullCloudBackup(user);
    return cleanCode;
}

export async function uploadToPublicBox(user) {
    if (!user || !globalState.friendCode) return;
    const activeAlbum = getActiveAlbum(); if (!activeAlbum) return;
    let repetidas = []; let faltantes = [];
    if (window.DATA && window.DATA.TEAMS) {
        window.DATA.TEAMS.forEach(team => { team.stickers.forEach(s => { const st = activeAlbum.stickers[s.code] || { have: false, count: 0 }; if (!st.have) faltantes.push(s.code); if (st.have && st.count > 1) repetidas.push(s.code); }); });
    }
    const compressedData = `${activeAlbum.id}|${repetidas.join(',')}|${faltantes.join(',')}`;
    const boxRef = doc(db, 'buzon_intercambios', globalState.friendCode);
    await setDoc(boxRef, { uid: user.uid, data: compressedData, lastUpdate: new Date().toISOString() });
}

export async function getFriendBox(friendCode) {
    const cleanCode = friendCode.trim().toUpperCase().replace(/\s+/g, '');
    const boxRef = doc(db, 'buzon_intercambios', cleanCode); const boxSnap = await getDoc(boxRef);
    if (!boxSnap.exists()) throw new Error("No se encontró a nadie con este código.");
    return boxSnap.data().data;
}