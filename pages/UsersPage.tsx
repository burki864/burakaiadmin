
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, UserX, UserCheck, Loader2, ShieldAlert, History, Trash2, Shield, Unlock, RefreshCcw, AlertTriangle, X, MessageSquare, Calendar, Mail, Info, Clock, ShieldCheck, Lock, Key, UserPlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfile, AdminLog, Message } from '../types.ts';

const MOCK_USERS: UserProfile[] = [
  { id: 'nexus-admin-master', username: 'burak_admin', full_name: 'Burak Yiğit', email: 'master@nexus.admin', banned: false, banned_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '1', username: 'kaito_dev', full_name: 'Kaito Shion', email: 'kaito@nexus.io', banned: false, banned_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '2', username: 'shadow_zero', full_name: 'Unknown Entity', email: 'shadow@dark.net', banned: true, banned_until: '2026-01-01T00:00:00Z', reason: 'Repeated policy violations (Spam)', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'offline' },
  { id: '3', username: 'beta_tester_01', full_name: 'John Doe', email: 'tester@google.com', banned: false, banned_until: null, created_at: new Date(Date.now() - 259200000).toISOString(), status: 'offline' },
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
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [showBanModal, setShowBanModal] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('1h');
  const [customDate, setCustomDate] = useState<string>('');
  
  const [showDeleteModal, setShowDeleteModal] = useState<UserProfile | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [currentAdminName, setCurrentAdminName] = useState('Admin');
  const [currentAdminId, setCurrentAdminId] = useState('nexus-admin-master');
  const [currentAdminRole, setCurrentAdminRole] = useState('Moderator');

  useEffect(() => {
    const session = localStorage.getItem('nexus_demo_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setCurrentAdminName(parsed.user?.name || 'Admin');
        setCurrentAdminId(parsed.user?.id || 'nexus-admin-master');
        setCurrentAdminRole(parsed.user?.role || 'Moderator');
      } catch (e) {}
    }

    const handleCliBan = (e: any) => {
      const { userId, reason } = e.detail;
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        setBanReason(reason || 'CLI Ban Protocol');
        handleAction(targetUser, true);
      }
    };

    window.addEventListener('nexus-execute-ban' as any, handleCliBan);
    return () => window.removeEventListener('nexus-execute-ban' as any, handleCliBan);
  }, [users]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        let uQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (filter === 'active') uQuery = uQuery.eq('banned', false);
        if (filter === 'banned') uQuery = uQuery.eq('banned', true);
        const { data: uData, error } = await uQuery;
        if (error) throw error;
        setUsers((uData as UserProfile[]) || []);

        const { data: lData } = await supabase
          .from('admin_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (lData) {
          const formatted = lData.map(l => ({
            ...l,
            action_type: l.action || 'BAN',
            target_user_id: l.target_id
          }));
          setLogs(formatted as AdminLog[]);
        }
      } catch (e) {
        console.error("Database Connection Failure:", e);
      }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      let data = stored ? JSON.parse(stored) : MOCK_USERS;
      if (filter === 'active') data = data.filter((u: any) => !u.banned);
      if (filter === 'banned') data = data.filter((u: any) => u.banned);
      setUsers(data);

      const storedLogs = localStorage.getItem('nexus_demo_logs');
      if (storedLogs) setLogs(JSON.parse(storedLogs));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchUserMessages = async (userId: string) => {
    setMessagesLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
        if (data) setUserMessages(data as Message[]);
      } catch (e) { console.error(e); }
    } else {
      setUserMessages([
        { id: 'm1', user_id: userId, content: 'Signal established. Real-time monitoring active.', created_at: new Date().toISOString() },
        { id: 'm2', user_id: userId, content: 'Data integrity check: 100%.', created_at: new Date(Date.now() - 3600000).toISOString() },
      ]);
    }
    setMessagesLoading(false);
  };

  const handleAction = async (user: UserProfile, isBan: boolean) => {
    setIsActionLoading(true);
    let bannedUntil: string | null = null;
    let durationLabel = "";

    if (isBan) {
      const now = new Date();
      const durations: Record<string, number> = { '30m': 30 * 60 * 1000, '1h': 60 * 60 * 1000, '12h': 12 * 60 * 60 * 1000, '1d': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };

      if (currentAdminRole === 'SuperAdmin') {
        if (banDuration === 'permanent') { bannedUntil = '9999-12-31T23:59:59Z'; durationLabel = "PERMANENT"; }
        else if (banDuration === 'custom' && customDate) { bannedUntil = new Date(customDate).toISOString(); durationLabel = `Custom`; }
        else if (durations[banDuration]) { bannedUntil = new Date(now.getTime() + durations[banDuration]).toISOString(); durationLabel = banDuration; }
        else { bannedUntil = new Date(now.getTime() + 3600000).toISOString(); durationLabel = "1H"; }
      } else {
        const safeDuration = Math.min(durations[banDuration] || 3600000, 24 * 60 * 60 * 1000);
        bannedUntil = new Date(now.getTime() + safeDuration).toISOString();
        durationLabel = banDuration;
      }
    }

    const logDetails = isBan 
      ? `${currentAdminName} restricted @${user.username} (${durationLabel})`
      : `${currentAdminName} restored @${user.username}`;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ banned: isBan, banned_until: bannedUntil, reason: isBan ? banReason : null }).eq('id', user.id);
        await supabase.from('admin_logs').insert({ action: isBan ? 'BAN' : 'UNBAN', target_id: user.id, details: logDetails });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      const allUsers = stored ? JSON.parse(stored) : MOCK_USERS;
      const updatedAll = allUsers.map((u: any) => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, banned_until: bannedUntil } : u);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updatedAll));
      
      const storedLogs = JSON.parse(localStorage.getItem('nexus_demo_logs') || '[]');
      storedLogs.unshift({ id: Math.random().toString(), admin_id: currentAdminId, action_type: isBan ? 'BAN' : 'UNBAN', details: logDetails, created_at: new Date().toISOString(), target_user: user, target_user_id: user.id });
      localStorage.setItem('nexus_demo_logs', JSON.stringify(storedLogs));
      fetchData();
    }
    
    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { title: 'SECURITY', message: logDetails, type: isBan ? 'error' : 'success' } }));
    setShowBanModal(null); setBanReason(''); setIsActionLoading(false);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    setIsActionLoading(true);
    const logDetails = `${currentAdminName} purged @${user.username}.`;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.from('admin_logs').insert({ action: 'DELETE_USER', target_id: user.id, details: logDetails });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      const storedLogs = JSON.parse(localStorage.getItem('nexus_demo_logs') || '[]');
      storedLogs.unshift({ id: Math.random().toString(), admin_id: currentAdminId, action_type: 'DELETE_USER', details: logDetails, created_at: new Date().toISOString() });
      localStorage.setItem('nexus_demo_logs', JSON.stringify(storedLogs));
    }

    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { title: 'PURGE', message: logDetails, type: 'warning' } }));
    setShowDeleteModal(null); setSelectedUser(null); setIsActionLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 md:gap-10">
      <div className="xl:col-span-4 flex flex-col space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-1 uppercase text-white leading-none">Identity Hub</h2>
            <p className="text-slate-500 font-bold text-[9px] md:text-sm uppercase tracking-[0.2em]">Managing Identity Nodes</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={fetchData} className="p-2.5 md:p-4 bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl text-slate-400">
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4 md:w-5 md:h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..." 
                className="bg-slate-950 border border-slate-800 rounded-xl md:rounded-3xl pl-10 md:pl-14 pr-4 py-3 md:py-4 text-sm focus:border-indigo-500 w-full md:w-80 outline-none text-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[1.5rem] md:rounded-[4rem] overflow-hidden backdrop-blur-3xl flex flex-col shadow-2xl min-h-[400px] md:min-h-[600px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-20">
               <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
               <p className="text-slate-500 font-black uppercase tracking-widest text-[9px]">Uplink Active...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-20 text-center">
               <UserPlus size={40} className="text-slate-700 mb-4" />
               <h3 className="text-xl font-black text-white uppercase mb-2">Empty Hub</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[300px] md:min-w-[900px]">
                <thead className="bg-slate-900/95 sticky top-0 z-10">
                  <tr className="text-slate-500 text-[9px] md:text-[11px] font-black uppercase tracking-widest border-b border-slate-800/80">
                    <th className="px-4 md:px-12 py-4 md:py-8">Identity</th>
                    <th className="hidden md:table-cell px-12 py-8">Security Node</th>
                    <th className="px-4 md:px-12 py-4 md:py-8">Status</th>
                    <th className="hidden md:table-cell px-12 py-8 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => { setSelectedUser(user); fetchUserMessages(user.id); }}
                      className="hover:bg-indigo-600/10 cursor-pointer transition-all group"
                    >
                      <td className="px-4 md:px-12 py-3 md:py-8">
                        <div className="flex items-center gap-3 md:gap-6">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(user.id)}`} 
                            className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-950 border border-slate-800 p-1" 
                          />
                          <div>
                            <p className="text-sm md:text-lg font-black text-slate-100 uppercase tracking-tight truncate max-w-[120px] md:max-w-none">
                              {user.full_name || user.username}
                            </p>
                            <p className="text-[8px] md:text-xs text-slate-500 font-bold tracking-widest uppercase">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-12 py-8">
                        <span className="text-xs text-slate-400 font-mono">{user.email}</span>
                      </td>
                      <td className="px-4 md:px-12 py-3 md:py-8">
                        <div className="flex items-center gap-3 md:gap-4">
                          {user.banned ? (
                            <span className="px-2 md:px-5 py-1 rounded-lg md:rounded-2xl bg-rose-500/10 text-rose-500 text-[8px] md:text-[10px] font-black uppercase border border-rose-500/20">BANNED</span>
                          ) : (
                            <span className="px-2 md:px-5 py-1 rounded-lg md:rounded-2xl bg-emerald-500/10 text-emerald-500 text-[8px] md:text-[10px] font-black uppercase border border-emerald-500/20">AUTH</span>
                          )}
                          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${user.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-12 py-8 text-right">
                         <p className="text-xs text-slate-500 font-mono">{new Date(user.created_at).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-1">
          <div className="sticky top-6 md:top-10 flex flex-col space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 px-2">
                <History className="text-indigo-500" size={24} />
                <h3 className="text-lg md:text-xl font-black uppercase tracking-widest text-white">Audits</h3>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-[1.5rem] md:rounded-[3rem] p-4 md:p-8 backdrop-blur-3xl shadow-2xl max-h-[300px] md:max-h-[700px] overflow-y-auto custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-center py-10 text-[9px] text-slate-600 font-black uppercase tracking-widest italic">Zero Logs</p>
                ) : logs.map((log) => (
                    <div key={log.id} className="mb-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] md:text-[10px] font-black uppercase text-indigo-400">{log.action_type}</span>
                            <span className="text-[7px] text-slate-600 font-mono">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-[9px] md:text-[11px] text-slate-400 font-medium leading-tight">{log.details}</p>
                    </div>
                ))}
            </div>
          </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 md:p-8 bg-slate-950/98 backdrop-blur-3xl">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[1.5rem] md:rounded-[5rem] w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-bottom-6">
            <div className="w-full md:w-[350px] bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-6 md:p-12 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
                <button onClick={() => setSelectedUser(null)} className="absolute top-4 left-4 md:top-10 md:left-10 p-3 bg-slate-800 rounded-xl text-slate-400"><X size={18} /></button>
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(selectedUser.id)}`} className="w-24 h-24 md:w-40 md:h-40 rounded-[2rem] md:rounded-[3rem] bg-slate-900 border-2 border-slate-800 p-2 mb-6 md:mb-10 shadow-2xl" />
                <h3 className="text-2xl md:text-4xl font-black text-white mb-1 md:mb-2 uppercase tracking-tighter leading-none">{selectedUser.full_name || selectedUser.username}</h3>
                <p className="text-slate-500 font-bold text-[8px] md:text-xs uppercase mb-6 md:mb-12 tracking-widest">@{selectedUser.username}</p>

                <div className="w-full space-y-3 mb-auto">
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-left overflow-hidden">
                        <p className="text-[8px] font-black text-slate-600 uppercase">Email Link</p>
                        <p className="text-xs font-bold text-slate-300 truncate">{selectedUser.email}</p>
                    </div>
                    {selectedUser.banned && (
                        <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-left">
                             <p className="text-[8px] font-black text-rose-500 uppercase mb-1">Suspended</p>
                             <p className="text-[10px] font-bold text-rose-200">{selectedUser.reason || 'ToS Violation'}</p>
                        </div>
                    )}
                </div>

                <div className="w-full grid grid-cols-1 gap-2 mt-6">
                    {selectedUser.banned ? (
                        <button onClick={() => handleAction(selectedUser, false)} className="py-4 md:py-6 bg-emerald-600 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase text-white transition-all">Restore Node</button>
                    ) : (
                        <button onClick={() => setShowBanModal(selectedUser)} className="py-4 md:py-6 bg-rose-600 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase text-white transition-all">Restrict Access</button>
                    )}
                    <button onClick={() => setShowDeleteModal(selectedUser)} className="py-4 md:py-6 bg-slate-800 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase text-slate-400 hover:bg-rose-700 transition-all">Purge Records</button>
                </div>
            </div>

            <div className="flex-1 p-6 md:p-16 flex flex-col bg-slate-900/30 overflow-hidden">
                <div className="flex items-center gap-4 mb-6 md:mb-10">
                    <MessageSquare className="text-indigo-500 w-6 h-6 md:w-8 md:h-8" />
                    <h4 className="text-xl md:text-3xl font-black uppercase text-white tracking-tighter leading-none">Transmission Logs</h4>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 md:space-y-6 pr-2">
                    {messagesLoading ? (
                        <div className="animate-pulse space-y-4"><div className="h-20 bg-slate-800/40 rounded-2xl"></div></div>
                    ) : userMessages.length === 0 ? (
                        <div className="py-20 text-center opacity-10 uppercase font-black tracking-widest text-xl">Zero Traffic</div>
                    ) : userMessages.map(msg => (
                        <div key={msg.id} className="p-6 md:p-10 bg-slate-950/40 border border-slate-800/80 rounded-[1.5rem] md:rounded-[3rem]">
                            <p className="text-[7px] md:text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">{new Date(msg.created_at).toLocaleString()}</p>
                            <p className="text-sm md:text-lg text-slate-300 font-medium leading-relaxed italic">"{msg.content}"</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      {showBanModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[4rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 md:p-16 overflow-y-auto custom-scrollbar flex-1">
                <div className="w-20 h-20 bg-rose-600/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                    <ShieldAlert size={40} />
                </div>
                <h3 className="text-2xl md:text-4xl font-black text-center text-white mb-4 uppercase">Restriction</h3>
                <p className="text-slate-500 font-bold text-center text-xs uppercase mb-8">Target: <strong className="text-white">@{showBanModal.username}</strong></p>

                <div className="space-y-6 text-left">
                    <div>
                        <label className="block text-[8px] font-black text-slate-600 uppercase mb-2 px-1 tracking-widest">Protocol Deviation</label>
                        <textarea 
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Reasoning..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none h-24 resize-none text-xs"
                        />
                    </div>

                    <div>
                        <label className="block text-[8px] font-black text-slate-600 uppercase mb-2 px-1 tracking-widest">Term</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['30m', '1h', '12h', '1d'].map(d => (
                              <button key={d} onClick={() => setBanDuration(d)} className={`py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${banDuration === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>{d}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-10">
                    <button onClick={() => setShowBanModal(null)} className="flex-1 py-5 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Abort</button>
                    <button 
                        onClick={() => handleAction(showBanModal, true)} 
                        disabled={isActionLoading || !banReason.trim()}
                        className="flex-1 py-5 bg-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30"
                    >
                        Restrict Node
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
