import React, { useState } from 'react';
import { updateProfile, updatePassword, User, deleteUser } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, deleteDoc, collection, query, where, getDocs, writeBatch, documentId } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { removeUndefined } from '../lib/firestoreUtils';
import { UserProfile } from '../types';
import { X, User as UserIcon, Lock, Phone, MessageSquare, Loader2, CheckCircle2, AlertCircle, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  user: User | null;
  profile: UserProfile | null;
  onClose: () => void;
}

export default function SettingsModal({ user, profile, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'feedback' | 'danger'>('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Form states
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [contactDetail, setContactDetail] = useState(profile?.contactDetail || '');
  const [review, setReview] = useState(profile?.review || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update Firebase Auth Profile
      await updateProfile(user, { displayName });

      // Update Firestore Profile
      await updateDoc(doc(db, 'users', user.uid), removeUndefined({
        displayName,
        contactDetail,
        updatedAt: serverTimestamp()
      }));

      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const performPasswordUpdate = async (sendNotification: boolean) => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updatePassword(user, newPassword);
      
      if (sendNotification) {
        await fetch('/api/notify-password-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword })
        });
      }

      setSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password. You may need to re-authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await performPasswordUpdate(false);
  };

  const handleUpdateAdminPassword = async () => {
    await performPasswordUpdate(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateDoc(doc(db, 'users', user.uid), removeUndefined({
        review,
        updatedAt: serverTimestamp()
      }));
      setSuccess('Audit review submitted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !profile) return;
    if (deleteConfirm !== 'DELETE') return;

    setLoading(true);
    setError(null);

    try {
      // 1. Delete Submissions - Robust check for both userId field and ID prefix
      const [userSubDocs, idSubDocs] = await Promise.all([
        getDocs(query(collection(db, 'submissions'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'submissions'), where(documentId(), '>=', user.uid + '_'), where(documentId(), '<', user.uid + '{')))
      ]);
      
      const batch = writeBatch(db);
      userSubDocs.forEach((doc) => batch.delete(doc.ref));
      idSubDocs.forEach((doc) => batch.delete(doc.ref));
      
      // 2. Delete Profile
      batch.delete(doc(db, 'users', user.uid));
      
      await batch.commit();

      // 3. Delete Auth User
      await deleteUser(user);
      
      onClose();
      window.location.reload(); // Force reload to clear state
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('CRITICAL: Account deletion requires a fresh login. Please log out and log back in to proceed with permanent destruction.');
      } else {
        setError(err.message || 'Failed to destroy account. Systems error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        className="bg-white rounded-[48px] w-full max-w-4xl max-h-[85vh] overflow-hidden flex shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-600 z-10"
        >
          <X size={20} />
        </button>

        {/* Sidebar Tabs */}
        <aside className="w-72 bg-slate-50 border-r border-slate-100 p-10 flex flex-col gap-4">
          <div className="mb-10 text-left">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2 text-left">System Config</h2>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-left">Internal Settings</h1>
          </div>

          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === 'profile' ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10 border border-blue-50" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <UserIcon size={18} /> Profile Sync
          </button>
          
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === 'security' ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10 border border-blue-50" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Lock size={18} /> Neural Hash
          </button>

          <button 
            onClick={() => setActiveTab('feedback')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              activeTab === 'feedback' ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10 border border-blue-50" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <MessageSquare size={18} /> System Audit
          </button>

          <button 
            onClick={() => setActiveTab('danger')}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-transparent",
              activeTab === 'danger' ? "bg-red-50 text-red-600 border-red-100 shadow-xl shadow-red-500/10" : "text-red-400/60 hover:bg-red-50/50 hover:text-red-600"
            )}
          >
            <Trash2 size={18} /> Account Void
          </button>

          <div className="mt-auto pt-10 border-t border-slate-200 text-left">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2">Authenticated As</p>
            <p className="text-sm font-black text-slate-900 truncate uppercase italic tracking-tighter">{profile?.email}</p>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 p-16 overflow-y-auto custom-scrollbar text-left">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="text-left">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4 text-left">Identity Synchronization</h3>
                  <p className="text-slate-500 font-medium">Configure your public-facing handle and contact parameters.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-4">Full Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-blue-600 transition-colors">
                        <UserIcon size={20} />
                      </div>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Neural Identity"
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-4">Contact Link / Detail</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-blue-600 transition-colors">
                        <Phone size={20} />
                      </div>
                      <input 
                        type="text" 
                        value={contactDetail}
                        onChange={(e) => setContactDetail(e.target.value)}
                        placeholder="+91-XXXX-XXXXXX or Social ID"
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={loading}
                    className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-6 rounded-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-900/10"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'REWRITE IDENTITY PROTOCOL'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="text-left">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4 text-left">Credential Encryption</h3>
                  <p className="text-slate-500 font-medium text-left">Update your neural hash to maintain session integrity.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-4">New Hash Protocol</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-blue-600 transition-colors">
                        <Lock size={20} />
                      </div>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-4">Confirm Hash Vector</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center text-slate-300 group-focus-within:text-blue-600 transition-colors">
                        <Lock size={20} />
                      </div>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    disabled={loading}
                    className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-6 rounded-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-900/10"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'ROTATE SECURITY KEY'}
                  </button>
                  
                  {profile?.role === 'admin' && (
                    <button 
                      type="button"
                      onClick={handleUpdateAdminPassword}
                      className="w-full bg-amber-50 text-amber-700 font-black text-xs uppercase tracking-widest py-6 rounded-3xl hover:bg-amber-100 transition-all"
                    >
                      CHANGE ADMIN PASSWORD
                    </button>
                  )}
                  
                  <p className="text-[9px] font-bold text-slate-400 uppercase text-center tracking-widest leading-relaxed px-10">
                    Warning: Major security rotations may terminate active sessions on other neural nodes. Re-authentication might be requested.
                  </p>
                </form>
              </motion.div>
            )}

            {activeTab === 'feedback' && (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="text-left">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4">Functional Review</h3>
                  <p className="text-slate-500 font-medium">Provide your subjective audit of the Elite system architecture.</p>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic ml-4">Subjective Assessment / Feedback</label>
                    <textarea 
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Your evaluation of the assessment terminal..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-[32px] p-8 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[200px] resize-none"
                    />
                  </div>

                  <button 
                    disabled={loading}
                    className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-6 rounded-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-slate-900/10"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'SUBMIT NEURAL AUDIT'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'danger' && (
              <motion.div 
                key="danger"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-10"
              >
                <div className="p-10 bg-red-50 border-2 border-red-100 rounded-[40px] text-left">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6">
                    <ShieldAlert size={32} />
                  </div>
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-4 text-red-600">Account Termination Protocol</h3>
                  <p className="text-red-900/60 font-bold mb-8 leading-relaxed">
                    Initiating this protocol will result in the <span className="text-red-600 underline decoration-2 underline-offset-4">permanent destruction</span> of your neural profile, all objective assessments, historical scores, and credential access. This action cannot be reversed by system administrators.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest italic ml-2">Type "DELETE" to confirm authorization</p>
                      <input 
                        type="text"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="UNAUTHORIZED_TERMINATION_LOCKED"
                        className="w-full bg-white border-2 border-red-200 rounded-2xl py-4 px-6 text-sm font-black tracking-widest placeholder:text-red-100 focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>

                    <button 
                      disabled={deleteConfirm !== 'DELETE' || loading}
                      onClick={handleDeleteAccount}
                      className={cn(
                        "w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-4 transition-all shadow-2xl",
                        deleteConfirm === 'DELETE' 
                          ? "bg-red-600 text-white shadow-red-500/30 hover:bg-red-700 hover:-translate-y-1" 
                          : "bg-red-100 text-red-300 cursor-not-allowed"
                      )}
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : (
                        <>
                          <Trash2 size={18} />
                          Finalize Termination
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <AlertCircle className="text-slate-400 shrink-0" size={20} />
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                    External data nodes and cached session identifiers may persist for up to 24 hours across global edge networks before total synchronization is achieved.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Indicators */}
          <div className="mt-8">
            <AnimatePresence>
              {success && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="bg-green-50 border border-green-100 p-6 rounded-3xl flex items-center gap-4 text-green-700"
                >
                  <CheckCircle2 size={24} className="shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{success}</p>
                </motion.div>
              )}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600"
                >
                  <AlertCircle size={24} className="shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
