
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const checkSecurityProtocols = async () => {
      setIsSecurityLoading(true);
      setInitialError(null);
      
      try {
        let currentSession = null;

        // 1. AUTH PROTOKOLÜ
        if (isSupabaseConfigured) {
          const { data: { session: sbSession }, error: authError } = await supabase.auth.getSession();
          if (authError) throw authError;
          currentSession = sbSession;
        } else {
          const localSession = localStorage.getItem('nexus_demo_session');
          currentSession = localSession ? JSON.parse(localSession) : null;
        }

        setSession(currentSession);

        // 2. BAN KONTROLÜ (Sadece Aktif Session Varsa)
        if (currentSession?.user) {
          if (isSupabaseConfigured) {
            const { data: profile, error: dbError } = await supabase
              .from('profiles')
              .select('banned, ban_until, username')
              .eq('id', currentSession.user.id)
              .single();

            // Kayıt bulunamaması bir hata değildir (yeni admin), ancak sistem hatasıysa yakala
            if (dbError && dbError.code !== 'PGRST116') {
              console.error("Security DB Error:", dbError);
            }

            if (profile?.banned) {
              setIsBanned(true);
              setBanDetails(profile);
            }
          } else {
            // Demo Modu Güvenlik Simülasyonu
            const demoUsers = JSON.parse(localStorage.getItem('nexus_demo_users') || '[]');
            const me = demoUsers.find((u: any) => u.email === currentSession?.user?.email);
            if (me?.banned) {
              setIsBanned(true);
              setBanDetails(me);
            }
          }
        }
      } catch (err: any) {
        console.error("CRITICAL_BOOT_FAILURE:", err);
        setInitialError("Sistem güvenlik protokolleri başlatılamadı. Lütfen ağ bağlantısını kontrol edin.");
      } finally {
        // FAIL-SAFE: Hata olsa dahi yükleme ekranını serbest bırak
        setIsSecurityLoading(false);
      }
    };

    checkSecurityProtocols();

    // Auth state değişimlerini dinle
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          setIsBanned(false);
          setBanDetails(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // 1. ADIM: YÜKLEME GUARD (Deadlock Korumalı)
  if (isSecurityLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-6">
        <div className="relative">
          <Loader2 className="animate-spin h-16 w-16 text-indigo-500" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 bg-indigo-500/40 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-center animate-pulse">
          <p className="text-slate-400 font-black text-xs tracking-[0.4em] uppercase">Nexus Terminal</p>
          <p className="text-slate-600 text-[10px] font-bold mt-2 uppercase tracking-widest">Verifikasyon Sürüyor...</p>
        </div>
      </div>
    );
  }

  // 2. ADIM: KRİTİK HATA GUARD
  if (initialError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6">
        <div className="bg-rose-500/10 border border-rose-500/20 p-12 rounded-[3rem] text-center max-w-lg">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Sistem Başlatılamadı</h2>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">{initialError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-rose-600/30 active:scale-95"
          >
            Sistemi Yeniden Yükle
          </button>
        </div>
      </div>
    );
  }

  // 3. ADIM: BAN GUARD
  if (isBanned) {
    return <BannedScreen details={banDetails} lang="tr" />;
  }

  return (
    <Router>
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-2 pointer-events-none">
          <Database size={14} className="text-amber-500" />
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
            Çevrimdışı Mod: Yerel Veritabanı Aktif
          </span>
        </div>
      )}
      
      <Routes>
        {/* Kullanıcı yoksa login'e, varsa dashboard'a yönlendir */}
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
