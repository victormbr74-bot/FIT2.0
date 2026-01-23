import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => Boolean(value)
);

let firebaseApp: FirebaseApp | undefined;
let firestoreInstance = null as ReturnType<typeof getFirestore> | null;

if (isFirebaseConfigured) {
  firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
  if (firebaseApp) {
    firestoreInstance = getFirestore(firebaseApp);
    enableIndexedDbPersistence(firestoreInstance, { synchronizeTabs: true })
      .then(() => {
        console.info("Persistência offline do Firestore habilitada.");
      })
      .catch((error) => {
        if (error.code === "failed-precondition") {
          console.warn(
            "Persistência offline não habilitada: múltiplas abas abertas (synchronizeTabs habilitado)."
          );
        } else if (error.code === "unimplemented") {
          console.warn("Persistência offline não suportada neste navegador.");
        } else {
          console.warn("Erro ao habilitar persistência offline do Firestore:", error);
        }
      });
  }
}

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore = firestoreInstance;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

export type FirebaseServices = {
  auth: ReturnType<typeof getAuth> | null;
  firestore: ReturnType<typeof getFirestore> | null;
  storage: ReturnType<typeof getStorage> | null;
};

export default firebaseConfig;
