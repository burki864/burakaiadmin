
import React, { useEffect, useState } from 'react';
import { History, Shield, Trash2, Ban, Unlock, Settings, LogIn, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { AdminLog } from '../types.ts';

const LogIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'BAN': return <Ban size={16} className="text-rose-500" />;
    case 'UNBAN': return <Unlock size={16} className="text-emerald-500" />;
    case 'DELETE_MESSAGE': return <Trash2 size={16} className="text-amber-500" />;
    case 'UPDATE_SETTINGS': return <Settings size={16} className="text-indigo-500" />;
    case 'LOGIN': return <LogIn size={16} className="text-indigo-500" />;
    default: return <Shield size={16} className="text-slate-400" />;
  }
};

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*, target_user:profiles(*)')
        .order('created_at', { ascending: false });
      
      if (data) setLogs(data as AdminLog[]);
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Administrative Audit</h2>
          <p className="text-slate-400">Immutable record of all moderator actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-700">
            <Calendar size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-slate-800 rounded animate-pulse"></div>
                  <div className="h-10 w-full bg-slate-800 rounded-xl animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <History size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">No administrative actions logged yet.</p>
          </div>
        ) : (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-slate-800 before:to-transparent">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-start group">
                <div className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 border-2 border-slate-800 group-hover:border-indigo-500 transition-colors z-10 bg-slate-950">
                  <LogIcon type={log.action_type} />
                </div>
                
                <div className="ml-16 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">{log.action_type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-xs text-slate-500 font-medium">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono">ID: {log.id.split('-')[0]}</div>
                  </div>
                  
                  <div className="bg-slate-800/30 border border-slate-700/30 p-5 rounded-2xl group-hover:bg-slate-800/50 transition-all">
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {log.details}
                    </p>
                    {log.target_user && (
                      <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg inline-flex border border-slate-800">
                        <img 
                          src={`https://picsum.photos/seed/${log.target_user_id}/20/20`} 
                          className="w-5 h-5 rounded"
                          alt="Target User"
                        />
                        <span className="text-xs text-slate-400 font-medium">Target: <strong className="text-slate-200">{log.target_user.username}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
