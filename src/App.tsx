import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TestInterface from './pages/TestInterface';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTestId, setActiveTestId] = useState<string | null>(() => {
    return localStorage.getItem('activeTestId');
  });

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

  if (!user || !profile) {
    return <AuthPage />;
  }

  const isSuperAdmin = profile.role === 'admin' || profile.email?.toLowerCase() === 'jeswinsamuel.la@gmail.com';
  const hasAdminAccess = isSuperAdmin || profile.role === 'staff' || profile.email?.toLowerCase() === 'thedivine.la@gmail.com';

  if (activeTestId) {
    return <TestInterface examId={activeTestId} onExit={handleExit} />;
  }

  return (
    <>
      {!hasAdminAccess ? (
        <StudentDashboard onStartTest={handleStartTest} />
      ) : (
        <AdminDashboard onStartTest={handleStartTest} />
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
