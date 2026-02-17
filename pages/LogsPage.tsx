
import React, { useEffect, useState } from 'react';
import { History, Shield, Trash2, Ban, Unlock, Settings, LogIn, Calendar, Loader2, AlertTriangle, Fingerprint } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { AdminLog } from '../types.ts';

const LogIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'BAN': return < Ban size={24} className="text-white" />;
    case 'UNBAN': return <Unlock size={24} className="text-white" />;
    case 'DELETE_USER': return <Trash2 size={24} className="text-white" />;
    case 'UPDATE_SETTINGS': return <Settings size={24} className="text-white" />;
    case 'LOGIN': return <LogIn size={24} className="text-white" />;
    default: return <Shield size={24} className="text-white" />;
  }
};

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('admin_logs')
          .select('*, target_user:profiles(*)')
          .order('created_at', { ascending: false });
        if (data) setLogs(data as AdminLog[]);
      } catch (e) { console.error(e); }
    } else {
      const stored = localStorage.getItem('nexus_demo_logs');
      if (stored) {
        setLogs(JSON.parse(stored));
      } else {
        setLogs([
          { 
            id: '1', 
            // Fix: Added missing admin_id required by AdminLog interface
            admin_id: 'nexus-admin-master',
            action_type: 'BAN', 
            details: 'System banned shadow_zero for [Repeated Spam] for [Permanent]', 
            created_at: new Date().toISOString() 
          }
        ]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase text-white">Audit Protocol</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Immutable History of Admin Actions</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchLogs} 
            className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400"
          >
             <History size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl shadow-indigo-600/20">
            <Calendar size={16} />
            Export Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-4 pb-20">
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center opacity-30">
             <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
             <p className="text-sm font-black uppercase tracking-[0.4em]">Intercepting Logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-40 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[4rem]">
            <Fingerprint size={64} className="text-slate-700 mx-auto mb-6 opacity-20" />
            <p className="text-2xl font-black text-slate-700 uppercase tracking-widest">No Security Logs Recorded</p>
          </div>
        ) : (
          logs.map((log) => {
            const isBan = log.action_type === 'BAN';
            const isUnban = log.action_type === 'UNBAN';
            const isPurge = log.action_type === 'DELETE_USER';

            return (
              <div 
                key={log.id} 
                className={`group relative overflow-hidden rounded-[3rem] border-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl ${
                  isBan ? 'bg-rose-500/10 border-rose-500/20' : 
                  isUnban ? 'bg-emerald-500/10 border-emerald-500/20' :
                  isPurge ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="p-10 flex flex-col md:flex-row items-center gap-10">
                  <div className={`shrink-0 w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl ${
                    isBan ? 'bg-rose-600 shadow-rose-600/20' : 
                    isUnban ? 'bg-emerald-600 shadow-emerald-600/20' :
                    isPurge ? 'bg-amber-600 shadow-amber-600/20' :
                    'bg-indigo-600'
                  }`}>
                    <LogIcon type={log.action_type} />
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        isBan ? 'bg-rose-600 text-white' : 
                        isUnban ? 'bg-emerald-600 text-white' :
                        isPurge ? 'bg-amber-600 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-700 font-mono hidden md:block">ID: {log.id.slice(0, 8)}</span>
                    </div>
                    
                    <h3 className={`text-2xl md:text-3xl font-black tracking-tighter uppercase leading-tight ${
                        isBan ? 'text-rose-100' : 
                        isUnban ? 'text-emerald-100' :
                        isPurge ? 'text-amber-100' :
                        'text-white'
                    }`}>
                      {log.details}
                    </h3>
                  </div>

                  {log.target_user && (
                    <div className="hidden lg:flex flex-col items-center gap-3 px-10 py-6 bg-slate-950/40 rounded-[2.5rem] border border-white/5">
                        <img 
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${log.target_user.id}`} 
                          className="w-12 h-12 rounded-xl bg-slate-900 p-1"
                          alt="Target"
                        />
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Target: @{log.target_user.username}</p>
                    </div>
                  )}
                </div>
                
                {/* Decorative background label */}
                <div className="absolute right-10 bottom-1/2 translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
                   <p className="text-8xl font-black uppercase italic tracking-tighter">{log.action_type}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LogsPage;
