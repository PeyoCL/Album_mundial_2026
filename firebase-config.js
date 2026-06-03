// firebase-config.js - Conexión con la nube

// Importamos la versión 12.14.0 que te asignó Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Tu configuración real
const firebaseConfig = {
  apiKey: "AIzaSyADrfxXPL5Cbh67NSlozPlJ81CNtT81PpI",
  authDomain: "album-2026-b734a.firebaseapp.com",
  projectId: "album-2026-b734a",
  storageBucket: "album-2026-b734a.firebasestorage.app",
  messagingSenderId: "207519523275",
  appId: "1:207519523275:web:c8eeec5b39afa80c93d64e",
  measurementId: "G-NJVZ2YYV9R"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos los servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// Exportamos las herramientas para usarlas en tu app.js
export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc };