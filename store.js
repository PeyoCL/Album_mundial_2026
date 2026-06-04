// store.js - Manejo de datos locales y sincronización con Firebase (v64)
import { db, doc, setDoc, getDoc, auth } from './firebase-config.js?v=64';

// 1. ESTADO GLOBAL DE LA APLICACIÓN
export const globalState = {
    albums: {}, // <-- CORREGIDO: Vuelve a ser un Diccionario (Objeto)
    activeAlbumId: null,
    friendCode: null
};

// 2. FUNCIONES DE ALMACENAMIENTO
export async function loadStore() {
    const stored = localStorage.getItem('albumStore');
    if (stored) {
        const parsed = JSON.parse(stored);
        globalState.albums = parsed.albums || {};
        globalState.activeAlbumId = parsed.activeAlbumId || null;
        globalState.friendCode = parsed.friendCode || null;
    }
}

export async function saveStore() {
    localStorage.setItem('albumStore', JSON.stringify(globalState));
    if (auth && auth.currentUser) {
        syncWithCloud(auth.currentUser, true);
    }
}

// 3. MANEJO DE ÁLBUMES
export function getActiveAlbum() {
    if (!globalState.activeAlbumId || !globalState.albums) return null;
    // CORREGIDO: Buscamos en el diccionario por ID en lugar de usar .find()
    return globalState.albums[globalState.activeAlbumId] || null;
}

export function createNewAlbum(name) {
    const id = 'album_' + Date.now();
    const newAlbum = {
        id: id,
        name: name,
        stickers: {} // <-- CORREGIDO: Vuelve a usar tu estructura de stickers original
    };
    globalState.albums[id] = newAlbum;
    globalState.activeAlbumId = id;
    saveStore();
    return newAlbum;
}

export function deleteActiveAlbum() {
    if (globalState.activeAlbumId) {
        delete globalState.albums[globalState.activeAlbumId];
        const remainingKeys = Object.keys(globalState.albums);
        globalState.activeAlbumId = remainingKeys.length > 0 ? remainingKeys[0] : null;
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
            saveStore();
            uploadToPublicBox(user);
            return true;
        } else {
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
    
    // CORREGIDO: Escaneamos el álbum usando tu estructura original
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
    await setDoc(boxRef, {
        uid: user.uid,
        data: compressedData,
        lastUpdate: new Date().toISOString()
    });
}

export async function getFriendBox(friendCode) {
    const cleanCode = friendCode.trim().toUpperCase().replace(/\s+/g, '');
    const boxRef = doc(db, 'buzon_intercambios', cleanCode);
    const boxSnap = await getDoc(boxRef);
    
    if (!boxSnap.exists()) {
        throw new Error("No se encontró a nadie con este código.");
    }
    return boxSnap.data().data;
}