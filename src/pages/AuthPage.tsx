import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { UserRole } from '../types';
import { GraduationCap, ShieldCheck, User as UserIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_CODE = 'teacher@987';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const sessionId = Math.random().toString(36).substring(7);
        sessionStorage.setItem('sessionId', sessionId);
        
        // Update session ID in Firestore to allow up to 2 sessions
        try {
          const userRef = doc(db, 'users', userCredential.user.uid);
          const userSnap = await getDoc(userRef);
          let currentSessions: string[] = [];
          if (userSnap.exists()) {
            const data = userSnap.data();
            currentSessions = data.sessionIds || (data.sessionId ? [data.sessionId] : []);
          }
          
          // Add new session, keep last 5 for stability across many devices
          if (!currentSessions.includes(sessionId)) {
            currentSessions.push(sessionId);
          }
          if (currentSessions.length > 5) {
            currentSessions = currentSessions.slice(-5);
          }

          const existingData = userSnap.exists() ? userSnap.data() : {};
          
          await setDoc(userRef, {
            uid: userCredential.user.uid,
            displayName: existingData.displayName || userCredential.user.displayName || 'Unknown',
            email: userCredential.user.email,
            role: existingData.role || 'student', // Default to student if document was wiped
            sessionId, 
            sessionIds: currentSessions,
            password, 
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${userCredential.user.uid}`);
        }

      } else {
        // Sign Up
        const isAdminEmail = email.toLowerCase() === 'jeswinsamuel.la@gmail.com';
        if (role === 'admin' && adminCodeInput !== ADMIN_CODE && !isAdminEmail) {
          throw new Error('Invalid Admin Secret Code');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });

        const sessionId = Math.random().toString(36).substring(7);
        sessionStorage.setItem('sessionId', sessionId);

        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            displayName,
            email,
            role,
            password, // Store for administrative monitoring
            sessionId,
            sessionIds: [sessionId],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${userCredential.user.uid}`);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in or use a different email.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const sessionId = Math.random().toString(36).substring(7);
      sessionStorage.setItem('sessionId', sessionId);

      if (userSnap.exists()) {
        const data = userSnap.data();
        let currentSessions: string[] = data.sessionIds || (data.sessionId ? [data.sessionId] : []);
        if (!currentSessions.includes(sessionId)) {
          currentSessions.push(sessionId);
        }
        if (currentSessions.length > 5) {
          currentSessions = currentSessions.slice(-5);
        }
        
        try {
          await setDoc(userRef, {
            sessionId,
            sessionIds: currentSessions,
            displayName: user.displayName || 'Unknown',
            email: user.email,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      } else {
        // Checking for admin verification if registering as an admin
        let finalRole: UserRole = 'student';
        if (!isLogin && role === 'admin') {
          const isUserAdminEmail = user.email?.toLowerCase() === 'jeswinsamuel.la@gmail.com';
          if (adminCodeInput !== ADMIN_CODE && !isUserAdminEmail) {
            try {
              await auth.signOut();
            } catch (e) {}
            throw new Error('Invalid Admin Secret Code for Admin Registration');
          }
          finalRole = 'admin';
        }
        
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: user.displayName || 'Google User',
            email: user.email,
            role: finalRole,
            password: 'google-oauth-session',
            sessionId,
            sessionIds: [sessionId],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <GraduationCap size={36} strokeWidth={2.5} />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-center text-slate-900 mb-2 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Join Conqueror'}
          </h1>
          <p className="text-slate-500 text-center mb-10 font-medium">
            JEE Advanced Preparation Hub
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-medium"
                      placeholder="e.g. Satish Kumar"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Account Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['student', 'admin'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-wider",
                            role === r 
                              ? "bg-blue-50 border-blue-600 text-blue-600" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {r === 'admin' && <ShieldCheck size={18} />}
                          {r === 'student' && <UserIcon size={18} />}
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {role === 'admin' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Verification Code</label>
                      <input
                        type="password"
                        required
                        value={adminCodeInput}
                        onChange={(e) => setAdminCodeInput(e.target.value)}
                        className="w-full px-4 py-3 bg-red-50/50 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-900"
                        placeholder="teacher@..."
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-medium"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 text-lg"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-3 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 py-3.5 border border-slate-200 px-4 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-3 text-base active:scale-[0.98]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-blue-600 font-bold transition-colors"
            >
              {isLogin ? (
                <span>New here? <span className="text-blue-600">Register Today</span></span>
              ) : (
                <span>Already registered? <span className="text-blue-600">Sign In</span></span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
