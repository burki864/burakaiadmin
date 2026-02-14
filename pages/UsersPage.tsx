import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, UserX, UserCheck, Loader2, ShieldAlert, History, Trash2, Shield, Settings, LogIn, Unlock, RefreshCcw, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfile, AdminLog } from '../types.ts';

const MOCK_USERS: UserProfile[] = [
  { id: '1', username: 'kaito_admin', email: 'kaito@nexus.io', banned: false, banned_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '2', username: 'shadow_user', email: 'shadow@dark.net', banned: true, banned_until: '2026-01-01T00:00:00Z', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'offline' },
];

const LogIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'BAN': return <Ban size={14} className="text-rose-500" />;
    case 'UNBAN': return <Unlock size={14} className="text-emerald-500" />;
    case 'DELETE_USER': return <Trash2 size={14} className="text-rose-600" />;
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
  const [showDeleteModal, setShowDeleteModal] = useState<UserProfile | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        // 1. Kullanıcıları Getir
        let uQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (filter === 'active') uQuery = uQuery.eq('banned', false);
        if (filter === 'banned') uQuery = uQuery.eq('banned', true);
        
        const { data: uData, error: uError } = await uQuery;
        if (uError) throw uError;
        if (uData) setUsers(uData as UserProfile[]);

        // 2. Logları Getir (Sütun isimleri güncellendi: action, target_id)
        const { data: lData, error: lError } = await supabase
          .from('admin_logs')
          .select('*') 
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (lError) console.warn("Log Tablosu Erişimi:", lError.message);
        if (lData) {
            // Log ikonları için action_type eşlemesi yapıyoruz
            const formattedLogs = lData.map(log => ({
                ...log,
                action_type: log.action || 'INFO', // DB'deki 'action' sütununu koda uyduruyoruz
                target_user_id: log.target_id
            }));
            setLogs(formattedLogs as AdminLog[]);
        }
      } catch (e) {
        console.error("Fetch Data Error:", e);
      }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      let data = stored ? JSON.parse(stored) : MOCK_USERS;
      if (filter === 'active') data = data.filter((u: any) => !u.banned);
      if (filter === 'banned') data = data.filter((u: any) => u.banned);
      setUsers(data);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
    if (isSupabaseConfigured) {
      const channel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [fetchData]);

  const handleAction = async (user: UserProfile, isBan: boolean) => {
    setIsActionLoading(true);
    if (isSupabaseConfigured) {
      try {
        // DÜZELTME: banned_until
        await supabase.from('profiles')
            .update({ 
                banned: isBan, 
                banned_until: isBan ? new Date(Date.now() + 86400000 * 365).toISOString() : null 
            })
            .eq('id', user.id);

        // DÜZELTME: action ve target_id
        await supabase.from('admin_logs').insert({ 
          action: isBan ? 'BAN' : 'UNBAN', 
          target_id: user.id, 
          details: `${isBan ? 'Banned' : 'Unbanned'} user: ${user.username}` 
        });
        
        fetchData();
      } catch (e) { console.error("Action Error:", e); }
    } else {
      const updated = users.map(u => u.id === user.id ? { ...u, banned: isBan } : u);
      setUsers(updated);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updated));
    }
    setShowBanModal(null);
    setIsActionLoading(false);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    setIsActionLoading(true);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.from('admin_logs').insert({ 
          action: 'DELETE_USER', 
          target_id: user.id, 
          details: `Deleted user: ${user.username}` 
        });
        fetchData();
      } catch (e) { console.error("Delete Error:", e); }
    } else {
      const updated = users.filter(u => u.id !== user.id);
      setUsers(updated);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updated));
    }
    setShowDeleteModal(null);
    setIsActionLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
      <div className="xl:col-span-4 flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase text-white">User Command</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Global Database Management</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Locate Identity..." 
                className="bg-slate-950 border border-slate-800 rounded-3xl pl-14 pr-8 py-4 text-base text-white focus:border-indigo-500 outline-none w-80 transition-all"
              />
            </div>
            <select 
              value={filter} onChange={(e: any) => setFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-3xl px-8 py-4 text-xs font-black uppercase text-indigo-400 outline-none cursor-pointer"
            >
              <option value="all">ALL ENTITIES</option>
              <option value="active">AUTHORIZED</option>
              <option value="banned">TERMINATED</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden backdrop-blur-3xl shadow-2xl min-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/95 sticky top-0 z-10">
              <tr className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] border-b border-slate-800/80">
                <th className="px-12 py-8">Signal / Identity</th>
                <th className="px-12 py-8">Connectivity</th>
                <th className="px-12 py-8">Clearance</th>
                <th className="px-12 py-8 text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading && users.length === 0 ? (
                <tr><td colSpan={4} className="px-12 py-20 text-center text-slate-500">Loading Cluster...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-12 py-20 text-center text-slate-700 font-black uppercase tracking-[0.5em]">No Records Found</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-indigo-600/5 transition-all group">
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-6">
                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 p-1" />
                        <div>
                          <p className="text-lg font-bold text-slate-100">{user.username}</p>
                          <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                        <span className={`text-[10px] font-black uppercase ${user.status === 'online' ? 'text-emerald-500' : 'text-slate-600'}`}>{user.status || 'Offline'}</span>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      {user.banned ? (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20">
                          <ShieldAlert size={12} /> BANNED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">
                          <UserCheck size={12} /> ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-12 py-8 text-right">
                      <div className="flex justify-end gap-3">
                        {user.banned ? (
                          <button onClick={() => handleAction(user, false)} className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-emerald-500/20">
                            Unlock
                          </button>
                        ) : (
                          <button onClick={() => setShowBanModal(user)} className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all border border-rose-500/20">
                            Ban
                          </button>
                        )}
                        <button onClick={() => setShowDeleteModal(user)} className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Stream */}
      <div className="xl:col-span-1 flex flex-col space-y-6 sticky top-10 h-fit">
        <div className="flex items-center gap-3 px-2">
          <History className="text-indigo-500" size={24} />
          <h3 className="text-lg font-black uppercase tracking-widest text-white">Audit Log</h3>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-10 uppercase font-black">No recent events</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <LogIcon type={log.action_type} />
                    <span className="text-[9px] font-black text-indigo-400 uppercase">{log.action_type}</span>
                  </div>
                  <span className="text-[8px] text-slate-600 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{log.details}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals (Ban & Delete) */}
      {showBanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><ShieldAlert size={40} /></div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase">Confirm Ban?</h3>
            <p className="text-slate-400 text-sm mb-8">@{showBanModal.username} will be restricted from the system.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowBanModal(null)} className="flex-1 py-4 bg-slate-800 rounded-2xl text-xs font-black text-slate-400 uppercase">Abort</button>
              <button onClick={() => handleAction(showBanModal, true)} disabled={isActionLoading} className="flex-1 py-4 bg-rose-600 rounded-2xl text-xs font-black text-white uppercase shadow-lg shadow-rose-600/20">
                {isActionLoading ? 'Wait...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-rose-600/20 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase">Purge Account?</h3>
            <p className="text-slate-400 text-sm mb-8">This action is permanent for @{showDeleteModal.username}.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-4 bg-slate-800 rounded-2xl text-xs font-black text-slate-400 uppercase">Cancel</button>
              <button onClick={() => handleDeleteUser(showDeleteModal)} disabled={isActionLoading} className="flex-1 py-4 bg-rose-700 rounded-2xl text-xs font-black text-white uppercase">Confirm Purge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;