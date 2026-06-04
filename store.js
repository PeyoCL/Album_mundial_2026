// store.js - Manejo de datos locales y sincronización con Firebase
import { db, doc, setDoc, getDoc, auth } from './firebase-config.js?v=58';

// 1. ESTADO GLOBAL DE LA APLICACIÓN
export const globalState = {
    albums: [],
    activeAlbumId: null,
    friendCode: null // NUEVO: Guarda el código único del usuario
};

// 2. FUNCIONES DE ALMACENAMIENTO LOCAL (Offline)
export async function loadStore() {
    const stored = localStorage.getItem('albumStore');
    if (stored) {
        const parsed = JSON.parse(stored);
        globalState.albums = parsed.albums || [];
        globalState.activeAlbumId = parsed.activeAlbumId || null;
        globalState.friendCode = parsed.friendCode || null;
    }
}

export async function saveStore() {
    // 1. Siempre guarda localmente (ultrarrápido)
    localStorage.setItem('albumStore', JSON.stringify(globalState));
    
    // 2. Si hay un usuario logueado, sincroniza con la nube y el buzón público en silencio
    if (auth && auth.currentUser) {
        syncWithCloud(auth.currentUser, true);
    }
}

// 3. MANEJO DE ÁLBUMES
export function getActiveAlbum() {
    if (!globalState.activeAlbumId) return null;
    return globalState.albums.find(a => a.id === globalState.activeAlbumId);
}

export function createNewAlbum(name) {
    const newAlbum = {
        id: 'album_' + Date.now(),
        name: name,
        repeated: [],
        missing: []
    };
    globalState.albums.push(newAlbum);
    globalState.activeAlbumId = newAlbum.id;
    saveStore();
    return newAlbum;
}

export function deleteActiveAlbum() {
    globalState.albums = globalState.albums.filter(a => a.id !== globalState.activeAlbumId);
    globalState.activeAlbumId = globalState.albums.length > 0 ? globalState.albums[0].id : null;
    saveStore();
}

export function getFamilyNameString(familyCode) {
    return familyCode; // Puede ser expandido si necesitas nombres completos de las familias
}

// 4. SINCRONIZACIÓN CON LA NUBE (LA BÓVEDA PRIVADA)
export async function syncWithCloud(user, isSaving = false) {
    if (!user) return false;
    
    const docRef = doc(db, 'usuarios', user.uid);
    
    if (isSaving) {
        // GUARDAR: Sobreescribe la nube con tus datos locales
        await setDoc(docRef, {
            albums: globalState.albums,
            activeAlbumId: globalState.activeAlbumId,
            friendCode: globalState.friendCode || null
        });
        uploadToPublicBox(user); // Sube copia a la plaza pública en silencio
        return true;
    } else {
        // DESCARGAR: Trae los datos de la nube al iniciar sesión
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            globalState.albums = data.albums || [];
            globalState.activeAlbumId = data.activeAlbumId || null;
            globalState.friendCode = data.friendCode || null;
            saveStore(); // Guarda lo descargado en tu celular
            uploadToPublicBox(user); // Actualiza la plaza pública
            return true;
        } else {
            // Primer inicio de sesión: sube tu progreso local a tu nueva cuenta
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

// 5. NUEVAS FUNCIONES SOCIALES (MATCH EN LÍNEA)

export async function claimFriendCode(user, desiredCode) {
    if (!user) throw new Error("Inicia sesión para crear tu código.");
    
    // Limpiamos el texto: todo a mayúsculas y sin espacios
    const cleanCode = desiredCode.trim().toUpperCase().replace(/\s+/g, '');
    if (cleanCode.length < 3) throw new Error("El código debe tener al menos 3 letras o números.");

    // Vamos al Registro Civil a preguntar si existe
    const codeRef = doc(db, 'codigos_reservados', cleanCode);
    const codeSnap = await getDoc(codeRef);

    if (codeSnap.exists()) {
        if (codeSnap.data().uid === user.uid) {
            // Ya era tuyo desde antes, todo bien
            globalState.friendCode = cleanCode;
            await syncWithCloud(user, true); 
            return cleanCode;
        } else {
            // Lo tiene otra persona
            throw new Error("Este código ya está en uso. ¡Prueba con otro!");
        }
    }

    // Si está libre, lo reclamamos a tu nombre
    await setDoc(codeRef, { uid: user.uid });
    
    // Lo guardamos en tu memoria privada y sincronizamos
    globalState.friendCode = cleanCode;
    await syncWithCloud(user, true);
    
    return cleanCode;
}

export async function uploadToPublicBox(user) {
    if (!user || !globalState.friendCode) return; // Si no tienes código, se cancela

    const activeAlbum = getActiveAlbum();
    if (!activeAlbum) return;
    
    // Comprimimos el álbum (mismo formato usado en los QR)
    const repString = (activeAlbum.repeated || []).join(',');
    const missingString = (activeAlbum.missing || []).join(',');
    const compressedData = `${activeAlbum.id}|${repString}|${missingString}`;

    // Lo subimos a la plaza pública bajo tu nombre único
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
        throw new Error("No se encontró a nadie con este código. Revisa si está bien escrito.");
    }
    
    return boxSnap.data().data; // Retorna el texto comprimido con las láminas del amigo
}