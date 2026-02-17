
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

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    end={to === "/dashboard"}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
      ${isActive 
        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}
    `}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </NavLink>
);

const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('Moderator');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();

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
      }, 5000);
    };

    window.addEventListener('nexus-toast' as any, handleToast);
    return () => window.removeEventListener('nexus-toast' as any, handleToast);
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('nexus_demo_session');
    }
    window.location.reload();
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-start gap-4 p-5 rounded-3xl border shadow-2xl animate-in slide-in-from-right-10 duration-300 ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' :
              toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-100' :
              toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-100' :
              'bg-indigo-500/10 border-indigo-500/20 text-indigo-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-500" /> :
               toast.type === 'error' ? <AlertTriangle size={18} className="text-rose-500" /> :
               toast.type === 'warning' ? <AlertTriangle size={18} className="text-amber-500" /> :
               <Info size={18} className="text-indigo-500" />}
            </div>
            <div className="flex-1">
              {toast.title && <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{toast.title}</p>}
              <p className="text-sm font-bold leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 text-white/20 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Nexus Admin</h1>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
            <SidebarLink to="/dashboard/users" icon={<Users size={20} />} label="Identity Hub" />
            <SidebarLink to="/dashboard/messages" icon={<MessageSquare size={20} />} label="Signal Stream" />
            <SidebarLink to="/dashboard/comms" icon={<Zap size={20} className="text-amber-500" />} label="Admin Comms" />
            <SidebarLink to="/dashboard/logs" icon={<History size={20} />} label="Audit Logs" />
            <SidebarLink to="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-slate-900/30 border-b border-slate-800/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
              <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest leading-none mb-1">Status</p>
              <p className="text-xs font-bold text-white uppercase leading-none">Uplink Stable</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900"></span>
            </button>
            <div className="h-8 w-px bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-white uppercase tracking-tighter">Hoşgeldin {adminName}</p>
                <p className="text-[9px] text-indigo-400 font-black tracking-[0.2em] uppercase">{adminRole}</p>
              </div>
              <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${adminName}`} 
                alt="Admin" 
                className="w-10 h-10 rounded-xl border-2 border-slate-800 bg-slate-900 p-1 shadow-lg"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar scroll-smooth">
          <div className="w-full mx-auto pb-20">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
