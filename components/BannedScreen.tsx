
import React from 'react';
import { ShieldAlert, LogOut, Clock, Globe, AlertCircle, Info, Fingerprint } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

interface BannedScreenProps {
  details?: {
    banned_until?: string | null;
    username?: string;
    reason?: string;
  };
  lang?: 'tr' | 'en';
}

const TRANSLATIONS = {
  tr: {
    title: "ERİŞİM REDDEDİLDİ",
    subtitle: "Hesabınız askıya alınmıştır.",
    reasonTitle: "Süreç Sebebi",
    reasonDefault: "Güvenlik politikası ihlali.",
    untilTitle: "Bitiş Tarihi",
    untilPermanent: "KALICI",
    actionLabel: "Oturumu Kapat",
    footer: "Destek: admin@nexus.io"
  },
  en: {
    title: "ACCESS DENIED",
    subtitle: "Account suspended.",
    reasonTitle: "Reason",
    reasonDefault: "Security violation.",
    untilTitle: "Ends At",
    untilPermanent: "PERMANENT",
    actionLabel: "Logout",
    footer: "Contact: admin@nexus.io"
  }
};

const BannedScreen: React.FC<BannedScreenProps> = ({ details, lang = 'tr' }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.tr;

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {}
    finally {
      localStorage.removeItem('nexus_demo_session');
      window.location.href = '/';
    }
  };

  const formatUntil = (dateStr?: string | null) => {
    if (!dateStr) return t.untilPermanent;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? t.untilPermanent : date.toLocaleDateString();
    } catch { return t.untilPermanent; }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-xl relative animate-in fade-in duration-700">
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-rose-500/20 p-8 md:p-16 rounded-[2rem] md:rounded-[4rem] text-center shadow-2xl">
          <div className="w-20 h-20 md:w-32 md:h-32 bg-rose-600/10 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-xl">
            <ShieldAlert size={40} className="md:size-64" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter">{t.title}</h1>
          <p className="text-slate-400 font-bold text-xs md:text-sm mb-10 uppercase tracking-widest px-4">
            {details?.username && <span className="text-rose-500">@{details.username}: </span>}{t.subtitle}
          </p>

          <div className="grid grid-cols-1 gap-4 mb-10">
            <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-left">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-2">{t.reasonTitle}</span>
              <p className="text-sm font-bold text-slate-200 italic leading-relaxed">"{details?.reason || t.reasonDefault}"</p>
            </div>
            <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 flex justify-between items-center">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{t.untilTitle}</span>
              <p className="text-sm font-black text-rose-500">{formatUntil(details?.banned_until)}</p>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95">
            {t.actionLabel}
          </button>
          
          <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest mt-10 leading-relaxed">{t.footer}</p>
        </div>
      </div>
    </div>
  );
};

export default BannedScreen;
