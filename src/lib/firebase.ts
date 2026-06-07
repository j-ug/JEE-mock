import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'ai-studio-fc70e8e0-9ac4-468a-9c22-9655c8062f3b');
export const auth = getAuth(app);

// Use local persistence to avoid logouts on mobile browser refresh
setPersistence(auth, browserLocalPersistence);

export const createSecondaryAuth = () => {
  const secondaryApp = initializeApp(firebaseConfig, `SecondaryCreationApp_${Date.now()}`);
  return getAuth(secondaryApp);
};
