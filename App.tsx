
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.tsx';
import DashboardLayout from './components/DashboardLayout.tsx';
import OverviewPage from './pages/OverviewPage.tsx';
import UsersPage from './pages/UsersPage.tsx';
import MessagesPage from './pages/MessagesPage.tsx';
import LogsPage from './pages/LogsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import BannedScreen from './components/BannedScreen.tsx';
import { supabase, isSupabaseConfigured } from './lib/supabase.ts';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banDetails, setBanDetails] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- CORE SECURITY ENGINE ---
  const checkSecurityContext = useCallback(async (currentSession: any) => {
    if (!currentSession?.user) return { banned: false, details: null };
    
    try {
      if (isSupabaseConfigured) {
        const { data: profile, error: dbError } = await supabase
          .from('profiles')
          .select('banned, ban_until, username')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (!dbError && profile) {
          return { banned: !!profile.banned, details: profile };
        }
      }
      
      // Local/Demo Auth Logic (for 'burakisbest' etc)
      const demoUsers = JSON.parse(localStorage.getItem('nexus_demo_users') || '[]');
      const me = demoUsers.find((u: any) => u.email === currentSession.user.email);
      return { banned: !!me?.banned, details: me || null };
    } catch (e) {
      console.error("Security probe failed:", e);
      return { banned: false, details: null };
    }
  }, []);

  // --- SYNC ENGINE ---
  const syncAuthState = useCallback(async () => {
    let currentSession = null;

    if (isSupabaseConfigured) {
      const { data: { session: sbSession } } = await supabase.auth.getSession();
      currentSession = sbSession;
    } else {
      const rawLocal = localStorage.getItem('nexus_demo_session');
      currentSession = rawLocal ? JSON.parse(rawLocal) : null;
    }

    const security = await checkSecurityContext(currentSession);
    
    setSession(currentSession);
    setIsBanned(security.banned);
    setBanDetails(security.details);
    setIsInitialized(true);
  }, [checkSecurityContext]);

  useEffect(() => {
    // Initial Boot
    syncAuthState();

    // Listener 1: External Storage Changes (Cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nexus_demo_session') syncAuthState();
    };

    // Listener 2: Internal Auth Bridge (Same-tab instant transition)
    const handleInternalAuth = () => {
      syncAuthState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('nexus-auth-refresh', handleInternalAuth);

    // Listener 3: Supabase Realtime Auth
    let authSub: any = null;
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        syncAuthState();
      });
      authSub = subscription;
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nexus-auth-refresh', handleInternalAuth);
      if (authSub) authSub.unsubscribe();
    };
  }, [syncAuthState]);

  // --- RENDER STATES ---
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-950">
        <div className="relative">
          <Loader2 className="animate-spin h-16 w-16 text-indigo-500/20" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 bg-indigo-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-indigo-500/40 font-mono text-[9px] tracking-[0.6em] uppercase animate-pulse">
          Establishing Uplink...
        </p>
      </div>
    );
  }

  if (isBanned) {
    return <BannedScreen details={banDetails || {}} lang="tr" />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <LoginPage /> : <Navigate to="/dashboard/users" replace />} 
        />
        
        <Route 
          path="/dashboard" 
          element={session ? <DashboardLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to={session ? "/dashboard/users" : "/login"} replace />} />
        <Route path="*" element={<Navigate to={session ? "/dashboard/users" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
