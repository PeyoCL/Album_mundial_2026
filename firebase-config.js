import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app-check.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADrfxXPL5Cbh67NSlozPlJ81CNtT81PpI",
  authDomain: "album-2026-b734a.firebaseapp.com",
  projectId: "album-2026-b734a",
  storageBucket: "album-2026-b734a.firebasestorage.app",
  messagingSenderId: "207519523275",
  appId: "1:207519523275:web:c8eeec5b39afa80c93d64e",
  measurementId: "G-NJVZ2YYV9R"
};

const app = initializeApp(firebaseConfig);
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LfEywwtAAAAADC9T77QS5btZpRnEAdIffC71GFu'),
  isTokenAutoRefreshEnabled: true 
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();


export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc };