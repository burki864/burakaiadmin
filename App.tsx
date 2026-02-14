
import React, { useState, useEffect, useMemo } from 'react';
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
import { Database, AlertTriangle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banDetails, setBanDetails] = useState<any>(null);
  const [isSecurityLoading, setIsSecurityLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  // FAIL-SAFE: Helper for safe storage parsing
  const getStoredSession = () => {
    try {
      const data = localStorage.getItem('nexus_demo_session');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Corrupted session data found, clearing storage.");
      localStorage.removeItem('nexus_demo_session');
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const runSecurityAudit = async () => {
      if (!isMounted) return;
      setIsSecurityLoading(true);
      setInitialError(null);
      
      try {
        let currentSession = null;

        // 1. PHASE ONE: IDENTITY VERIFICATION
        if (isSupabaseConfigured) {
          const { data: { session: sbSession }, error: authError } = await supabase.auth.getSession();
          if (authError) throw authError;
          currentSession = sbSession;
        } else {
          currentSession = getStoredSession();
        }

        // 2. PHASE TWO: BAN ENFORCEMENT (Only if session is valid)
        let bannedFlag = false;
        let profileDetails = null;

        if (currentSession?.user) {
          if (isSupabaseConfigured) {
            const { data: profile, error: dbError } = await supabase
              .from('profiles')
              .select('banned, ban_until, username')
              .eq('id', currentSession.user.id)
              .maybeSingle(); // Use maybeSingle to avoid 406/PGRST116 crashes

            if (dbError) console.warn("Profile check failed, proceeding with caution:", dbError);
            
            if (profile?.banned) {
              bannedFlag = true;
              profileDetails = profile;
            }
          } else {
            // Local Demo Ban Check
            const demoUsers = JSON.parse(localStorage.getItem('nexus_demo_users') || '[]');
            const me = demoUsers.find((u: any) => u.email === currentSession?.user?.email);
            if (me?.banned) {
              bannedFlag = true;
              profileDetails = me;
            }
          }
        }

        // 3. PHASE THREE: ATOMIC STATE UPDATE
        // This ensures the render loop is triggered once with all data ready
        if (isMounted) {
          setSession(currentSession);
          setIsBanned(bannedFlag);
          setBanDetails(profileDetails);
        }

      } catch (err: any) {
        if (isMounted) {
          console.error("BOOT_ERROR:", err);
          setInitialError("Security hardware failure. System cannot verify integrity.");
        }
      } finally {
        if (isMounted) setIsSecurityLoading(false);
      }
    };

    runSecurityAudit();

    // AUTH LISTENER: Updates session in real-time
    let authSubscription: any = null;
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        // If logged out, reset security flags
        if (!newSession) {
          setIsBanned(false);
          setBanDetails(null);
        }
      });
      authSubscription = subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // RENDER GUARD: Loading State (No Router rendered here to prevent loops)
  if (isSecurityLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-6">
        <div className="relative">
          <Loader2 className="animate-spin h-20 w-20 text-indigo-500/40" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-500 font-black text-[10px] tracking-[0.5em] uppercase">Booting Nexus Command</p>
          <div className="mt-4 flex gap-1 justify-center">
            {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-500/20 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
          </div>
        </div>
      </div>
    );
  }

  // RENDER GUARD: Boot Error
  if (initialError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6">
        <div className="bg-rose-500/5 border border-rose-500/20 p-12 rounded-[4rem] text-center max-w-lg shadow-[0_0_100px_rgba(244,63,94,0.05)]">
          <AlertTriangle className="w-20 h-20 text-rose-600 mx-auto mb-8 animate-pulse" />
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">System Integrity Fault</h2>
          <p className="text-slate-400 text-sm mb-12 leading-relaxed font-semibold uppercase tracking-widest">{initialError}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-rose-600/30 active:scale-95"
          >
            Reset Master Terminal
          </button>
        </div>
      </div>
    );
  }

  // RENDER GUARD: Suspension
  if (isBanned) {
    return <BannedScreen details={banDetails} lang="tr" />;
  }

  return (
    <Router>
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-xl px-4 py-2.5 flex items-center justify-center gap-3 pointer-events-none">
          <Database size={14} className="text-amber-500" />
          <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em]">
            Warning: Operating in Local Cache Mode (Database Offline)
          </span>
        </div>
      )}
      
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

        <Route path="*" element={<Navigate to={session ? "/dashboard/users" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
