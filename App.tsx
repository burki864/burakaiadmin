
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
    
    // Check master admin first (demo behavior)
    if (currentSession.user.id === 'nexus-admin-master') {
      try {
        const stored = localStorage.getItem('nexus_demo_users');
        if (stored) {
           const users = JSON.parse(stored);
           const me = users.find((u: any) => u.id === 'nexus-admin-master');
           if (me?.banned) return { banned: true, details: me };
        }
      } catch (e) {
        console.warn("Failed to parse demo users", e);
      }
      return { banned: false, details: { username: 'Burak', role: 'SuperAdmin' } };
    }

    try {
      if (isSupabaseConfigured) {
        const { data: profile, error: dbError } = await supabase
          .from('profiles')
          .select('banned, banned_until, username, reason') 
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (!dbError && profile) {
          // Check if ban is still active (timestamp check)
          const isCurrentlyBanned = profile.banned && (!profile.banned_until || new Date(profile.banned_until) > new Date());
          return { banned: !!isCurrentlyBanned, details: profile };
        }
      }
      
      // Local/Demo Auth Logic
      const stored = localStorage.getItem('nexus_demo_users');
      if (stored) {
        const demoUsers = JSON.parse(stored);
        const me = demoUsers.find((u: any) => u.id === currentSession.user.id || u.email === currentSession.user.email);
        return { banned: !!me?.banned, details: me || null };
      }
      return { banned: false, details: null };
    } catch (e) {
      console.error("Security probe failed:", e);
      return { banned: false, details: null };
    }
  }, []);

  // --- SYNC ENGINE ---
  const syncAuthState = useCallback(async () => {
    try {
      let currentSession = null;
      const rawLocal = localStorage.getItem('nexus_demo_session');
      
      if (rawLocal) {
        try {
          currentSession = JSON.parse(rawLocal);
        } catch (e) {
          localStorage.removeItem('nexus_demo_session');
        }
      } 
      
      if (!currentSession && isSupabaseConfigured) {
        const { data: { session: sbSession } } = await supabase.auth.getSession();
        currentSession = sbSession;
      }

      const security = await checkSecurityContext(currentSession);
      
      setSession(currentSession);
      setIsBanned(security.banned);
      setBanDetails(security.details);
    } catch (error) {
      console.error("Auth sync cycle failed:", error);
    } finally {
      setIsInitialized(true);
    }
  }, [checkSecurityContext]);

  useEffect(() => {
    syncAuthState();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nexus_demo_session' || e.key === 'nexus_demo_users') syncAuthState();
    };

    const handleInternalAuth = () => {
      syncAuthState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('nexus-auth-refresh', handleInternalAuth);

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

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-950">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-500 mb-4" />
        <p className="text-indigo-500/40 font-mono text-[10px] tracking-[0.4em] animate-pulse uppercase">Syncing Uplink...</p>
      </div>
    );
  }

  if (isBanned && session) {
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
