// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXy3E2Ubwe_zjHhCZj38_LuBmKX5PVrsA",
    authDomain: "invsys-a2457.firebaseapp.com",
    projectId: "invsys-a2457",
    storageBucket: "invsys-a2457.firebasestorage.app",
    messagingSenderId: "30920312450",
    appId: "1:30920312450:web:ca4ef280c16f9af072569b",
    measurementId: "G-2MD3Z2N3BH"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };