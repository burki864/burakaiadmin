
import React from 'react';
// Fixed: Added Fingerprint to the lucide-react import
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
    subtitle: "Hesabınız güvenlik protokolleri gereği askıya alınmıştır.",
    reasonTitle: "Yasaklanma Sebebi",
    reasonDefault: "Sistem politikalarının ihlali veya şüpheli aktivite tespiti.",
    untilTitle: "Kısıtlama Bitiş",
    untilPermanent: "KALICI (SÜRESİZ)",
    actionLabel: "Oturumu Kapat",
    footer: "Bu kararın bir hata olduğunu düşünüyorsanız admin@nexus.io üzerinden iletişime geçin."
  },
  en: {
    title: "ACCESS DENIED",
    subtitle: "Your account has been suspended due to security protocols.",
    reasonTitle: "Reason for Suspension",
    reasonDefault: "Violation of system policies or detected suspicious activity.",
    untilTitle: "Restriction Ends",
    untilPermanent: "PERMANENT",
    actionLabel: "Sign Out",
    footer: "If you believe this is an error, please contact the support team via admin@nexus.io."
  }
};

const BannedScreen: React.FC<BannedScreenProps> = ({ details, lang = 'tr' }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.tr;

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem('nexus_demo_session');
      }
      window.location.reload();
    } catch (e) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const formatUntil = (dateStr?: string | null) => {
    if (!dateStr) return t.untilPermanent;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return t.untilPermanent;
      
      return date.toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return t.untilPermanent;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-600/5 rounded-full blur-[160px] pointer-events-none"></div>
      
      <div className="w-full max-w-3xl relative animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-rose-500/20 p-12 md:p-24 rounded-[5rem] shadow-[0_0_120px_rgba(244,63,94,0.1)] text-center">
          
          <div className="w-40 h-40 bg-rose-600/10 text-rose-500 rounded-[3.5rem] flex items-center justify-center mx-auto mb-12 border border-rose-500/20 shadow-2xl animate-pulse">
            <ShieldAlert size={80} />
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 uppercase">{t.title}</h1>
          <p className="text-slate-400 font-bold text-lg mb-16 uppercase tracking-widest leading-relaxed px-10">
            {details?.username ? <span className="text-rose-500">@{details.username}, </span> : ''}{t.subtitle}
          </p>

          <div className="grid grid-cols-1 gap-8 mb-16">
            <div className="p-10 bg-slate-950/60 rounded-[3rem] border border-slate-800/80 text-left">
              <div className="flex items-center gap-4 mb-4 text-slate-500">
                <Info size={20} className="text-rose-500" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{t.reasonTitle}</span>
              </div>
              <p className="text-lg font-bold text-slate-200 leading-relaxed italic">
                "{details?.reason || t.reasonDefault}"
              </p>
            </div>

            <div className="p-10 bg-slate-950/40 rounded-[3rem] border border-slate-800/80 text-left flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock size={20} className="text-slate-500" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t.untilTitle}</span>
              </div>
              <p className="text-lg font-black text-rose-500 tracking-tighter">
                {formatUntil(details?.banned_until)}
              </p>
            </div>
          </div>

          <div className="space-y-10">
            <button 
              onClick={handleLogout}
              className="w-full py-8 bg-rose-600 hover:bg-rose-500 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(225,29,72,0.3)] active:scale-95"
            >
              <LogOut size={20} />
              {t.actionLabel}
            </button>
            
            <p className="text-[11px] text-slate-600 font-bold uppercase tracking-[0.2em] px-20 leading-relaxed">
              {t.footer}
            </p>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-center gap-6 opacity-20">
          <Fingerprint size={20} className="text-slate-500" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocol 77-B Terminal Node</p>
        </div>
      </div>
    </div>
  );
};

export default BannedScreen;
