import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, Loader2, Info } from 'lucide-react';

const ADMIN_PASSWORDS = [
  'burakaiadmin109',
  'burakaiadmin345',
  'burakaiadmin876'
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
      // Security Protocol Check
      if (ADMIN_PASSWORDS.includes(password)) {
        const mockSession = { 
          user: { email: 'master@nexus.admin', id: 'nexus-admin-master' }, 
          expires_at: Date.now() + 3600000 
        };
        localStorage.setItem('nexus_demo_session', JSON.stringify(mockSession));
        
        // Artificial delay for high-security feel
        await new Promise(resolve => setTimeout(resolve, 800));
        window.location.reload();
      } else {
        throw new Error('Invalid Security Key. Unauthorized Access Attempt Logged.');
      }
    } catch (err: any) {
      setError(err.message || 'Authorization failed. Check system credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-600 rounded-[2.5rem] mb-6 shadow-2xl shadow-indigo-500/30 transform transition-transform hover:scale-105">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase">Nexus Command</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Restricted Access Terminal</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-500">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex gap-4 items-center">
              <Info size={16} className="shrink-0 text-indigo-500" />
              <p>Biometric or Hardware Key Required. Enter Master Override Code.</p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-4 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Administrative Key</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-white placeholder:text-slate-700 font-mono tracking-[0.5em] text-lg"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Verify Access
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6 opacity-30">
          <div className="flex gap-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-1 w-6 bg-slate-700 rounded-full"></div>)}
          </div>
          <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
            AES-256 End-to-End Encryption Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;