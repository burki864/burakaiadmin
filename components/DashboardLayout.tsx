
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  Bell,
  ShieldCheck,
  Zap,
  X,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => (
  <NavLink
    to={to}
    end={to === "/dashboard"}
    onClick={onClick}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
      ${isActive 
        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-lg' 
        : 'text-slate-500 hover:text-slate-100 hover:bg-slate-800/50'}
    `}
  >
    {icon}
    <span className="font-medium text-sm md:text-base">{label}</span>
  </NavLink>
);

const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('Moderator');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const rawLocal = localStorage.getItem('nexus_demo_session');
    if (rawLocal) {
      try {
        const session = JSON.parse(rawLocal);
        if (session.user?.name) setAdminName(session.user.name);
        if (session.user?.role) setAdminRole(session.user.role);
      } catch (e) {}
    }

    const handleToast = (e: any) => {
      const { message, type, title } = e.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type, title }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };

    window.addEventListener('nexus-toast' as any, handleToast);
    return () => window.removeEventListener('nexus-toast' as any, handleToast);
  }, []);

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("SignOut Warning (Suppressed)");
    } finally {
      localStorage.removeItem('nexus_demo_session');
      window.location.href = '/';
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <div className="fixed top-4 md:top-6 right-4 md:right-6 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] md:w-full md:max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto flex items-start gap-3 p-3 md:p-5 rounded-xl md:rounded-3xl border shadow-2xl animate-in slide-in-from-right-10 duration-300 ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' :
              toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-100' :
              'bg-indigo-500/10 border-indigo-500/20 text-indigo-100'
            }`}>
            <div className="shrink-0 mt-0.5">
               {toast.type === 'success' ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-rose-500" />}
            </div>
            <div className="flex-1">
              <p className="text-[11px] md:text-sm font-bold leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 opacity-20 hover:opacity-100"><X size={14} /></button>
          </div>
        ))}
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-4 md:p-6">
          <div className="flex items-center gap-3 mb-8 md:mb-10 px-2">
            <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg shadow-lg">
              <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter leading-none">Nexus Admin</h1>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarLink to="/dashboard/users" icon={<Users size={18} />} label="Identity Hub" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/dashboard/messages" icon={<MessageSquare size={18} />} label="Signals" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/dashboard/comms" icon={<Zap size={18} className="text-amber-500" />} label="Uplink Comms" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/dashboard/logs" icon={<History size={18} />} label="Audit Log" onClick={() => setIsSidebarOpen(false)} />
            <SidebarLink to="/dashboard/settings" icon={<Settings size={18} />} label="Settings" onClick={() => setIsSidebarOpen(false)} />
          </nav>

          <div className="pt-4 border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all">
              <LogOut size={18} />
              <span className="font-bold text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 md:h-20 bg-slate-900/30 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-full">
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black uppercase text-indigo-400">Stable</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] md:text-sm font-black text-white uppercase tracking-tighter leading-none">{adminName}</p>
              <p className="text-[7px] md:text-[9px] text-indigo-500 font-black tracking-widest uppercase">{adminRole}</p>
            </div>
            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${adminName}`} className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border border-slate-800 p-0.5" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-10 custom-scrollbar">
          <div className="w-full mx-auto pb-10 md:pb-20">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
