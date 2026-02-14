
import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, Loader2, Info } from 'lucide-react';

const ADMIN_PASSWORDS = [
  'burakaiadmin109',
  'burakaiadmin345',
  'burakaiadmin876',
  'burakisbest', 
  'hepinizinamk'  
];

const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedPass = password.trim();
      
      if (ADMIN_PASSWORDS.includes(trimmedPass)) {
        const mockSession = { 
          user: { 
            email: 'master@nexus.admin', 
            id: 'nexus-admin-master',
            name: 'Burak'
          }, 
          expires_at: Date.now() + 3600000 
        };

        // 1. Commit to Local Storage
        localStorage.setItem('nexus_demo_session', JSON.stringify(mockSession));
        
        // 2. TRIGGER AUTH BRIDGE (CRITICAL FIX)
        // This notifies App.tsx to re-run its sync logic immediately
        window.dispatchEvent(new Event('nexus-auth-refresh'));

        // 3. UI Gecikmesi (Hissiyat için)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigation is handled automatically by App.tsx observing the state change
      } else {
        throw new Error('Geçersiz Güvenlik Anahtarı. Yetkisiz Erişim Girişimi Loglandı.');
      }
    } catch (err: any) {
      setError(err.message || 'Yetkilendirme hatası.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-600 rounded-[2.5rem] mb-6 shadow-2xl shadow-indigo-500/30 transform transition-all hover:scale-105 active:scale-95 cursor-none">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Nexus Command</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">Biometric Auth Required</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-500">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 px-5 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex gap-4 items-center">
              <Info size={16} className="shrink-0 text-indigo-500" />
              <p>Hardware Key Override Enabled. Enter Secure Passcode.</p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest animate-in shake-1 duration-300 text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1">Security Token</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="CODE_PHRASE"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-6 pl-16 pr-6 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-white placeholder:text-slate-800 font-mono tracking-[0.6em] text-lg"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-6 rounded-2xl shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-[11px]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Engage Uplink
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center opacity-20 pointer-events-none">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
            Protocol 77-B Secure • BurakAI Systems
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
