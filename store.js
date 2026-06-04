// store.js - Manejo de datos locales y sincronización con Firebase (v66)
import { db, doc, setDoc, getDoc, auth } from './firebase-config.js?v=66';

// 1. ESTADO GLOBAL
export const globalState = {
    albums: {}, 
    activeAlbumId: null,
    friendCode: null
};

// --- EL SANITIZADOR MAESTRO ---
// Esta función repara silenciosamente cualquier daño estructural en la base de datos.
function sanitizeData() {
    // 1. Si los álbumes se volvieron un Array, los reparamos a Diccionario
    if (Array.isArray(globalState.albums)) {
        const fixedAlbums = {};
        globalState.albums.forEach(a => { if (a && a.id) fixedAlbums[a.id] = a; });
        for (let k in globalState.albums) { if (isNaN(k) && globalState.albums[k]?.id) fixedAlbums[k] = globalState.albums[k]; }
        globalState.albums = fixedAlbums;
    }
    
    // 2. Revisamos cada álbum por dentro
    for (let id in globalState.albums) {
        let a = globalState.albums[id];
        if (!a.profile) a.profile = { name: a.name || "Mi Álbum" };
        
        // Si las láminas se volvieron un Array, las convertimos de vuelta a Diccionario
        if (Array.isArray(a.stickers)) {
            let fixedS = {};
            a.stickers.forEach(s => { 
                if (s && s.code) fixedS[s.code] = s; 
            });
            a.stickers = fixedS;
        } else if (!a.stickers) {
            a.stickers = {};
        }
    }
    
    // 3. Asegurar que haya un álbum activo válido
    if (!globalState.activeAlbumId || !globalState.albums[globalState.activeAlbumId]) {
        const keys = Object.keys(globalState.albums);
        globalState.activeAlbumId = keys.length > 0 ? keys[0] : null;
    }
}

// 2. FUNCIONES DE ALMACENAMIENTO
export async function loadStore() {
    const stored = localStorage.getItem('albumStore');
    if (stored) {
        const parsed = JSON.parse(stored);
        globalState.albums = parsed.albums || {};
        globalState.activeAlbumId = parsed.activeAlbumId || null;
        globalState.friendCode = parsed.friendCode || null;
        sanitizeData(); // Limpiamos al cargar de la memoria local
    }
}

export async function saveStore() {
    sanitizeData(); // Limpiamos antes de guardar
    localStorage.setItem('albumStore', JSON.stringify(globalState));
    if (auth && auth.currentUser) {
        syncWithCloud(auth.currentUser, true);
    }
}

// 3. MANEJO DE ÁLBUMES
export function getActiveAlbum() {
    sanitizeData();
    if (!globalState.activeAlbumId) return null;
    let album = globalState.albums[globalState.activeAlbumId];
    
    // Auto-Rellenador de seguridad
    if (window.DATA && window.DATA.TEAMS) {
        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                if (!album.stickers[s.code]) {
                    album.stickers[s.code] = { have: false, count: 0 };
                }
            });
        });
    }
    return album;
}

export function createNewAlbum(name) {
    const id = 'album_' + Date.now();
    globalState.albums[id] = { id: id, name: name, profile: { name: name }, stickers: {} };
    globalState.activeAlbumId = id;
    saveStore();
    return getActiveAlbum();
}

export function deleteActiveAlbum() {
    if (globalState.activeAlbumId) {
        delete globalState.albums[globalState.activeAlbumId];
        sanitizeData();
        saveStore();
    }
}

export function getFamilyNameString(familyCode) {
    return familyCode || "Mi Álbum"; 
}

// 4. SINCRONIZACIÓN CON LA NUBE
export async function syncWithCloud(user, isSaving = false) {
    if (!user) return false;
    const docRef = doc(db, 'usuarios', user.uid);
    
    if (isSaving) {
        sanitizeData();
        await setDoc(docRef, {
            albums: globalState.albums,
            activeAlbumId: globalState.activeAlbumId,
            friendCode: globalState.friendCode || null
        });
        uploadToPublicBox(user);
        return true;
    } else {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            globalState.albums = data.albums || {};
            globalState.activeAlbumId = data.activeAlbumId || null;
            globalState.friendCode = data.friendCode || null;
            sanitizeData(); // Limpiamos los datos que llegan de la nube
            saveStore();
            uploadToPublicBox(user);
            return true;
        } else {
            sanitizeData();
            await setDoc(docRef, {
                albums: globalState.albums,
                activeAlbumId: globalState.activeAlbumId,
                friendCode: globalState.friendCode || null
            });
            uploadToPublicBox(user);
            return false;
        }
    }
}

// 5. FUNCIONES SOCIALES (MATCH EN LÍNEA)
export async function claimFriendCode(user, desiredCode) {
    if (!user) throw new Error("Inicia sesión para crear tu código.");
    const cleanCode = desiredCode.trim().toUpperCase().replace(/\s+/g, '');
    if (cleanCode.length < 3) throw new Error("El código debe tener al menos 3 letras o números.");

    const codeRef = doc(db, 'codigos_reservados', cleanCode);
    const codeSnap = await getDoc(codeRef);

    if (codeSnap.exists()) {
        if (codeSnap.data().uid === user.uid) {
            globalState.friendCode = cleanCode;
            await syncWithCloud(user, true); 
            return cleanCode;
        } else {
            throw new Error("Este código ya está en uso. ¡Prueba con otro!");
        }
    }

    await setDoc(codeRef, { uid: user.uid });
    globalState.friendCode = cleanCode;
    await syncWithCloud(user, true);
    return cleanCode;
}

export async function uploadToPublicBox(user) {
    if (!user || !globalState.friendCode) return;
    const activeAlbum = getActiveAlbum();
    if (!activeAlbum) return;
    
    let repetidas = [];
    let faltantes = [];
    
    if (window.DATA && window.DATA.TEAMS) {
        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                const st = activeAlbum.stickers[s.code] || { have: false, count: 0 };
                if (!st.have) faltantes.push(s.code);
                if (st.have && st.count > 1) repetidas.push(s.code);
            });
        });
    }

    const compressedData = `${activeAlbum.id}|${repetidas.join(',')}|${faltantes.join(',')}`;
    const boxRef = doc(db, 'buzon_intercambios', globalState.friendCode);
    await setDoc(boxRef, { uid: user.uid, data: compressedData, lastUpdate: new Date().toISOString() });
}

export async function getFriendBox(friendCode) {
    const cleanCode = friendCode.trim().toUpperCase().replace(/\s+/g, '');
    const boxRef = doc(db, 'buzon_intercambios', cleanCode);
    const boxSnap = await getDoc(boxRef);
    if (!boxSnap.exists()) throw new Error("No se encontró a nadie con este código.");
    return boxSnap.data().data;
}