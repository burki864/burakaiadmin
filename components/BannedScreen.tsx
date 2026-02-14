
import React from 'react';
import { ShieldAlert, LogOut, Clock, Globe, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

interface BannedScreenProps {
  details?: {
    banned_until?: string | null;
    username?: string;
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
  // CRASH PROTECTION: Eğer lang tanımsızsa veya TRANSLATIONS içinde yoksa Türkçe'ye düş.
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
      // Fallback for logout failure
      localStorage.clear();
      window.location.href = '/';
    }
  };

  // TARİH FORMATLAMA (Fail-Safe)
  const formatUntil = (dateStr?: string | null) => {
    if (!dateStr) return t.untilPermanent;
    try {
      const date = new Date(dateStr);
      // Geçersiz tarih kontrolü (NaN)
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
      {/* Visual background layers */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-rose-500/20 p-12 md:p-20 rounded-[4rem] shadow-[0_0_120px_rgba(244,63,94,0.08)] text-center">
          
          <div className="w-32 h-32 bg-rose-600/10 text-rose-500 rounded-[3rem] flex items-center justify-center mx-auto mb-10 border border-rose-500/20 shadow-2xl shadow-rose-600/10">
            <ShieldAlert size={64} className="animate-pulse" />
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-4 uppercase">{t.title}</h1>
          <p className="text-slate-500 font-bold text-sm md:text-base mb-12 uppercase tracking-widest leading-relaxed">
            {details?.username ? <span className="text-rose-400">@{details.username}, </span> : ''}{t.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 bg-slate-950/50 rounded-[2.5rem] border border-slate-800/80 text-left hover:border-slate-700 transition-colors group">
              <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-slate-400 transition-colors">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.reasonTitle}</span>
              </div>
              <p className="text-xs font-bold text-slate-300 leading-relaxed uppercase">{t.reasonDefault}</p>
            </div>

            <div className="p-8 bg-slate-950/50 rounded-[2.5rem] border border-slate-800/80 text-left hover:border-rose-900/30 transition-colors group">
              <div className="flex items-center gap-3 mb-3 text-slate-500 group-hover:text-rose-400/60 transition-colors">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.untilTitle}</span>
              </div>
              <p className="text-xs font-bold text-rose-500 leading-relaxed uppercase">
                {formatUntil(details?.banned_until)}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <button 
              onClick={handleLogout}
              className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-rose-600/20 active:scale-95"
            >
              <LogOut size={18} />
              {t.actionLabel}
            </button>
            
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.1em] px-12 leading-relaxed opacity-60">
              {t.footer}
            </p>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-4 opacity-30">
          <Globe size={16} className="text-slate-500" />
          <div className="h-4 w-px bg-slate-800"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nexus Command - High Security Infrastructure</p>
        </div>
      </div>
    </div>
  );
};

export default BannedScreen;
