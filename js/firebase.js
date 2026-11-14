import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyCkK3jRQFI_JOr4PB2UUk8Y0XK3q-1Uzmk',authDomain:'store-management-150d6.firebaseapp.com',projectId:'store-management-150d6',storageBucket:'store-management-150d6.firebasestorage.app',messagingSenderId:'778307476882',appId:'1:778307476882:web:1a0e71b12b71fb6265354b',measurementId:'G-6JLZHFEX5E'};
const app=initializeApp(firebaseConfig);
const db=getFirestore(app);
const ref=section=>doc(db,'storeOS',section);

export async function loadSection(section){try{const snap=await getDoc(ref(section));return snap.exists()?snap.data().items||[]:[]}catch(e){console.error(e);return[]}}
export async function saveSection(section,items){try{await setDoc(ref(section),{items,updatedAt:new Date().toISOString()})}catch(e){console.error(e);throw e}}
