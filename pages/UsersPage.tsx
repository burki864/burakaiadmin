
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, UserX, UserCheck, Loader2, ShieldAlert, History, Trash2, Shield, Settings, LogIn, Unlock, RefreshCcw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfile, AdminLog } from '../types.ts';

const MOCK_USERS: UserProfile[] = [
  { id: '1', username: 'kaito_admin', email: 'kaito@nexus.io', banned: false, ban_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '2', username: 'shadow_user', email: 'shadow@dark.net', banned: true, ban_until: '2026-01-01T00:00:00Z', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'offline' },
  { id: '3', username: 'beta_tester', email: 'tester@google.com', banned: false, ban_until: null, created_at: new Date(Date.now() - 259200000).toISOString(), status: 'offline' },
  { id: '4', username: 'nova_prime', email: 'nova@space.io', banned: false, ban_until: null, created_at: new Date(Date.now() - 345600000).toISOString(), status: 'online' },
  { id: '5', username: 'admin_test', email: 'test@nexus.io', banned: false, ban_until: null, created_at: new Date(Date.now() - 518400000).toISOString(), status: 'offline' },
  { id: '6', username: 'zero_cool', email: 'zero@hack.net', banned: false, ban_until: null, created_at: new Date(Date.now() - 604800000).toISOString(), status: 'online' },
  { id: '7', username: 'acid_burn', email: 'acid@hack.net', banned: false, ban_until: null, created_at: new Date(Date.now() - 691200000).toISOString(), status: 'online' },
  { id: '8', username: 'lord_nikon', email: 'nikon@hack.net', banned: false, ban_until: null, created_at: new Date(Date.now() - 777600000).toISOString(), status: 'offline' },
];

const LogIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'BAN': return <Ban size={14} className="text-rose-500" />;
    case 'UNBAN': return <Unlock size={14} className="text-emerald-500" />;
    case 'DELETE_MESSAGE': return <Trash2 size={14} className="text-amber-500" />;
    case 'UPDATE_SETTINGS': return <Settings size={14} className="text-indigo-500" />;
    case 'LOGIN': return <LogIn size={14} className="text-indigo-500" />;
    default: return <Shield size={14} className="text-slate-400" />;
  }
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [showBanModal, setShowBanModal] = useState<UserProfile | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        let uQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (filter === 'active') uQuery = uQuery.eq('banned', false);
        if (filter === 'banned') uQuery = uQuery.eq('banned', true);
        const { data: uData } = await uQuery;
        if (uData) setUsers(uData as UserProfile[]);

        const { data: lData } = await supabase
          .from('admin_logs')
          .select('*, target_user:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(20);
        if (lData) setLogs(lData as AdminLog[]);
      } catch (e) {
        console.error("Database Connection Failure:", e);
      }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      let data = stored ? JSON.parse(stored) : MOCK_USERS;
      if (filter === 'active') data = data.filter((u: any) => !u.banned);
      if (filter === 'banned') data = data.filter((u: any) => u.banned);
      setUsers(data);
      setLogs([]); 
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
    if (isSupabaseConfigured) {
      const channel = supabase.channel('dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_logs' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [fetchData]);

  const handleAction = async (user: UserProfile, isBan: boolean) => {
    setIsActionLoading(true);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ banned: isBan, ban_until: isBan ? new Date(Date.now() + 86400000 * 365).toISOString() : null }).eq('id', user.id);
        await supabase.from('admin_logs').insert({ 
          action_type: isBan ? 'BAN' : 'UNBAN', 
          target_user_id: user.id, 
          details: `${isBan ? 'Terminated' : 'Reinstated'} access for ${user.username}` 
        });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      const updated = users.map(u => u.id === user.id ? { ...u, banned: isBan } : u);
      setUsers(updated);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updated));
    }
    setShowBanModal(null);
    setIsActionLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
      {/* Primary Control Column - Grow naturally long */}
      <div className="xl:col-span-4 flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase text-white">User Command</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Global Database Management & Real-time Enforcement</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData} 
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400 hover:text-indigo-400 active:scale-95"
              title="Refresh Data"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Locate Identity Signal..." 
                className="bg-slate-950 border border-slate-800 rounded-3xl pl-14 pr-8 py-4 text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 w-80 transition-all shadow-2xl"
              />
            </div>
            <select 
              value={filter} onChange={(e: any) => setFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-3xl px-8 py-4 text-xs font-black uppercase tracking-widest outline-none cursor-pointer text-indigo-400 focus:border-indigo-500 transition-all hover:bg-slate-900"
            >
              <option value="all">ALL ENTITIES</option>
              <option value="active">AUTHORIZED</option>
              <option value="banned">TERMINATED</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] overflow-hidden backdrop-blur-3xl flex flex-col shadow-2xl min-h-[600px]">
          <div className="flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/95 backdrop-blur-md sticky top-0 z-10">
                <tr className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] border-b border-slate-800/80">
                  <th className="px-12 py-8">Signal / Identity</th>
                  <th className="px-12 py-8">Connectivity</th>
                  <th className="px-12 py-8">Clearance</th>
                  <th className="px-12 py-8 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading && users.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-12 py-10"><div className="h-12 bg-slate-800/40 rounded-3xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={4} className="px-12 py-60 text-center text-slate-700 font-black uppercase tracking-[0.5em] italic opacity-50">Empty Database Segment</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-indigo-600/5 transition-all group">
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-6">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} 
                            className="w-16 h-16 rounded-[1.5rem] bg-slate-950 border-2 border-slate-800 group-hover:border-indigo-500/50 transition-all p-1.5 shadow-xl group-hover:scale-105" 
                          />
                          <div>
                            <p className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors">{user.username}</p>
                            <p className="text-xs text-slate-500 font-mono tracking-tighter opacity-60">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${user.status === 'online' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`}></div>
                          <span className={`text-xs font-black uppercase tracking-widest ${user.status === 'online' ? 'text-emerald-500' : 'text-slate-600'}`}>{user.status || 'Offline'}</span>
                        </div>
                      </td>
                      <td className="px-12 py-8">
                        {user.banned ? (
                          <span className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/20 shadow-inner">
                            <ShieldAlert size={14} />
                            TERMINATED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-inner">
                            <UserCheck size={14} />
                            AUTHORIZED
                          </span>
                        )}
                      </td>
                      <td className="px-12 py-8 text-right">
                        {user.banned ? (
                          <button 
                            onClick={() => handleAction(user, false)} 
                            className="inline-flex items-center gap-3 px-8 py-3.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all border border-emerald-500/20 shadow-2xl active:scale-95"
                          >
                            <Unlock size={18} />
                            Reinstate
                          </button>
                        ) : (
                          <button 
                            onClick={() => setShowBanModal(user)} 
                            className="inline-flex items-center gap-3 px-8 py-3.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all border border-rose-500/20 shadow-2xl active:scale-95"
                          >
                            <UserX size={18} />
                            Terminate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Stream Column - Sticky sidebar for long scroll */}
      <div className="xl:col-span-1 flex flex-col space-y-8 h-fit sticky top-10">
        <div className="flex items-center gap-4 px-2">
          <History className="text-indigo-500" size={28} />
          <h3 className="text-xl font-black tracking-tighter uppercase tracking-[0.2em] text-white">Audits</h3>
        </div>
        
        <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] p-10 flex flex-col backdrop-blur-3xl shadow-2xl max-h-[80vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
            {logs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20 h-full min-h-[300px]">
                <Shield size={60} className="mb-6 text-slate-700" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Events</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-6 bg-slate-950/40 rounded-[2.5rem] border border-slate-800/50 hover:border-indigo-500/30 transition-all group animate-in slide-in-from-right-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <LogIcon type={log.action_type} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{log.action_type}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-mono font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mb-5">{log.details}</p>
                  {log.target_user && (
                     <div className="flex items-center gap-4 mt-4 pt-5 border-t border-slate-800/50">
                       <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${log.target_user_id}`} className="w-8 h-8 rounded-xl bg-slate-900 shadow-inner" />
                       <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">@{log.target_user.username}</span>
                     </div>
                  )}
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-8 py-5 text-xs font-black uppercase tracking-[0.3em] text-slate-600 hover:text-indigo-400 transition-all bg-slate-950/50 rounded-3xl border border-dashed border-slate-800 hover:border-indigo-500/50 shrink-0 shadow-lg">
            Audit Archive
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setShowBanModal(null)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-[5rem] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_0_150px_rgba(0,0,0,0.9)]">
            <div className="p-20 text-center">
              <div className="w-32 h-32 bg-rose-600/10 text-rose-500 rounded-[3rem] flex items-center justify-center mx-auto mb-12 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
                <ShieldAlert size={64} />
              </div>
              <h3 className="text-4xl font-black tracking-tighter mb-6 uppercase text-white">Execute Termination?</h3>
              <p className="text-slate-500 font-bold text-base mb-16 leading-relaxed max-w-md mx-auto">
                Authorized protocol for restricting all database privileges for <strong className="text-white">@{showBanModal.username}</strong>. Action will be permanent and logged.
              </p>
              
              <div className="flex gap-6">
                <button 
                  onClick={() => setShowBanModal(null)} 
                  className="flex-1 py-8 bg-slate-800 hover:bg-slate-700 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] text-slate-400 transition-all active:scale-95"
                >
                  Abort
                </button>
                <button 
                  onClick={() => handleAction(showBanModal, true)} 
                  disabled={isActionLoading}
                  className="flex-1 py-8 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl shadow-rose-600/40 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isActionLoading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Confirm Protocol'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
