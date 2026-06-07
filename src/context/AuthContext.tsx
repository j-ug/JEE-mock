import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, onIdTokenChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType, removeUndefined } from '../lib/firestoreUtils';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Heartbeat for online status
  useEffect(() => {
    if (!user) return;

    const updateHeartbeat = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), removeUndefined({
          lastSeen: serverTimestamp()
        }));
      } catch (e: any) {
        // If the document doesn't exist yet, it's fine, we'll try again next interval
        if (e.code !== 'not-found') {
          console.error("Heartbeat failed", e);
        }
      }
    };

    // Initial delay or check could be added, but immediately calling is fine if we ignore not-found
    const interval = setInterval(updateHeartbeat, 300000); // 5 minutes
    
    // We don't call immediately to let the initial profile creation happen if needed
    // or we can call it after a short delay
    const initialTimeout = setTimeout(updateHeartbeat, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Initial profile fetch
        try {
          // Increase timeout to wait for SDK readiness
          await new Promise(resolve => setTimeout(resolve, 2000));
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile({ ...data, uid: firebaseUser.uid });
          }
        } catch (err: any) {
          // Gracefully handle transient offline errors, 
          // as onSnapshot will handle real-time sync immediately after
          if (err?.message?.includes('offline')) {
            console.warn("Firestore client temporarily offline during init, relying on onSnapshot.");
          } else {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen for profile changes (including concurrent session checks)
  useEffect(() => {
    if (!user) return;

    const currentSessionId = sessionStorage.getItem('sessionId');
    if (!currentSessionId) {
      const newId = Math.random().toString(36).substring(7);
      sessionStorage.setItem('sessionId', newId);
    }

    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          const updatedProfile = { ...data, uid: user.uid };
          setProfile(updatedProfile);

    // Concurrent session check (Allow multiple devices)
    const storedSessionId = sessionStorage.getItem('sessionId');
    const activeSessions = data.sessionIds || (data.sessionId ? [data.sessionId] : []);
    
    if (activeSessions.length > 0 && storedSessionId && !activeSessions.includes(storedSessionId)) {
      // Logic for multi-device support: Just ensure the current session is registered eventually
      // We removed the warning to respect the user's preference for multi-device usage.
    }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
    );

    return () => unsubscribeProfile();
  }, [user]);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
