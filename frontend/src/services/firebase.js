/**
 * services/firebase.js
 * --------------------
 * Inicialización del Firebase SDK v9 (modular) para el frontend React.
 * 
 * ⚠️  CONFIGURACIÓN REQUERIDA:
 * Reemplazar los valores de firebaseConfig con los de tu proyecto Firebase.
 * Ubicación: Firebase Console → Tu Proyecto → Configuración del Proyecto → Web App → SDK Config
 * 
 * Expone:
 *   - db: instancia de Firestore para uso directo.
 *   - subscribeToInvoices(): listener en tiempo real.
 *   - updateInvoiceField(): actualiza un campo específico.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// ---------------------------------------------------------------------------
// Configuración del proyecto Firebase
// Reemplazar con tus credenciales reales del .env o directamente aquí.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             || "AIzaSyA54elVDqb8noSCyLQh9nsR-_ZgU-pU6_Y",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || "proveedores-a7ede.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || "proveedores-a7ede",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || "proveedores-a7ede.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "4375286215",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || "1:4375286215:web:020e646520e3c2ba0289e2",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      || "G-R88YZ7NHMQ",
};

// Inicializar Firebase (singleton)
const app = initializeApp(firebaseConfig);

// Instancia de Firestore y Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Nombre de la colección (debe coincidir con el backend)
const INVOICES_COLLECTION = "invoices";

// ---------------------------------------------------------------------------
// subscribeToInvoices
// ---------------------------------------------------------------------------
/**
 * Suscribe a cambios en tiempo real de la colección 'invoices'.
 * Usa onSnapshot de Firestore para actualizar la UI automáticamente
 * cuando otro cliente o el backend agrega/modifica facturas.
 *
 * @param {function} onData - Callback que recibe el array de facturas.
 * @param {function} onError - Callback de error.
 * @returns {function} unsubscribe - Función para cancelar la suscripción.
 */
export const subscribeToInvoices = (onData, onError) => {
  const q = query(
    collection(db, INVOICES_COLLECTION),
    orderBy("created_at", "desc")
  );

  // onSnapshot retorna una función unsubscribe — importante para cleanup en useEffect
  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convertir Firestore Timestamp a string ISO legible
        created_at: doc.data().created_at?.toDate?.()?.toISOString() ?? null,
      }));
      onData(invoices);
    },
    (error) => {
      console.error("[Firebase] Error en listener:", error);
      if (onError) onError(error);
    }
  );
};

// ---------------------------------------------------------------------------
// updateInvoiceField
// ---------------------------------------------------------------------------
/**
 * Actualiza un campo específico de una factura en Firestore.
 * Usado para toggle de "autorizada" y "pagada" desde la tabla.
 *
 * @param {string} docId - ID del documento en Firestore.
 * @param {string} field - Nombre del campo a actualizar.
 * @param {any} value - Nuevo valor.
 */
export const updateInvoiceField = async (docId, field, value) => {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, docId);
    await updateDoc(docRef, { [field]: value });
    console.log(`[Firebase] Actualizado ${docId}.${field} = ${value}`);
  } catch (error) {
    console.error("[Firebase] Error al actualizar:", error);
    throw error;
  }
};
