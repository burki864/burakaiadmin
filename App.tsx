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
    // Eğer oturum yoksa güvenlik kontrolüne gerek yok
    if (!currentSession?.user) return { banned: false, details: null };
    
    // ÖZEL DURUM: Manuel Admin girişi (burakisbest vb.) ise sorgusuz kabul et
    if (currentSession.user.id === 'nexus-admin-master') {
      return { banned: false, details: { username: 'Burak', role: 'SuperAdmin' } };
    }
    
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
      return { banned: false, details: null };
    } catch (e) {
      return { banned: false, details: null };
    }
  }, []);

  // --- SYNC ENGINE (Geliştirilmiş Öncelik Modu) ---
  const syncAuthState = useCallback(async () => {
    let currentSession = null;

    // 1. Önce LocalStorage'daki manuel oturumu kontrol et (burakisbest için en garantisi)
    const rawLocal = localStorage.getItem('nexus_demo_session');
    
    if (rawLocal) {
      currentSession = JSON.parse(rawLocal);
    } 
    // 2. Eğer local yoksa ve Supabase varsa oradan çek
    else if (isSupabaseConfigured) {
      try {
        const { data: { session: sbSession } } = await supabase.auth.getSession();
        currentSession = sbSession;
      } catch (e) {
        console.warn("Supabase auth unreachable");
      }
    }

    const security = await checkSecurityContext(currentSession);
    
    setSession(currentSession);
    setIsBanned(security.banned);
    setBanDetails(security.details);
    setIsInitialized(true);
  }, [checkSecurityContext]);

  useEffect(() => {
    syncAuthState();

    // Dinleyiciler: Giriş yapıldığı an tetiklenir
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nexus_demo_session') syncAuthState();
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

  // --- RENDER STATES ---
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-950">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-500 mb-4" />
        <p className="text-indigo-500/40 font-mono text-[10px] tracking-[0.4em] animate-pulse">
          INITIALIZING NEXUS...
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