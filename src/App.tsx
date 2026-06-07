import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TestInterface from './pages/TestInterface';
import { Loader2, WifiOff } from 'lucide-react';
import { SplineSceneBasic } from './components/ui/spline-demo';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTestId, setActiveTestId] = useState<string | null>(() => {
    return localStorage.getItem('activeTestId');
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartTest = React.useCallback((id: string | null) => {
    setActiveTestId(id);
    if (id) {
      localStorage.setItem('activeTestId', id);
    } else {
      localStorage.removeItem('activeTestId');
    }
  }, []);

  const handleExit = React.useCallback(() => {
    handleStartTest(null);
  }, [handleStartTest]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {!isOnline && (
        <div className="fixed bottom-6 right-6 z-[100] bg-zinc-900 border border-zinc-700 text-white p-6 rounded-2xl shadow-2xl flex items-center gap-4 transition-all duration-300 transform translate-y-0 opacity-100">
          <WifiOff className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <h4 className="font-bold">Offline Syncing</h4>
            <p className="text-zinc-400 text-sm">Results are being saved locally. They will auto-sync once connected.</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={() => setShowWelcome(false)}
          >
            <SplineSceneBasic />
          </motion.div>
        )}
      </AnimatePresence>

      {!user || !profile ? (
        <AuthPage />
      ) : (
        <>
          {activeTestId ? (
            <TestInterface examId={activeTestId} onExit={handleExit} />
          ) : (
            (profile.role === 'admin' || profile.email?.toLowerCase() === 'jeswinsamuel.la@gmail.com' || profile.role === 'staff' || profile.email?.toLowerCase() === 'thedivine.la@gmail.com') ? (
              <AdminDashboard onStartTest={handleStartTest} />
            ) : (
              <StudentDashboard onStartTest={handleStartTest} />
            )
          )}
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
