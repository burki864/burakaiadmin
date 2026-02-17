
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

    // Global Listener for CLI Commands from AdminComms
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
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const seedData = async () => {
    if (!isSupabaseConfigured) return;
    setIsActionLoading(true);
    try {
      for (const user of MOCK_USERS) {
         await supabase.from('profiles').upsert({
           id: user.id,
           username: user.username,
           full_name: user.full_name,
           email: user.email,
           banned: user.banned,
           banned_until: user.banned_until,
           reason: user.reason,
           created_at: user.created_at
         });
      }
      fetchData();
    } catch (e) { console.error(e); }
    setIsActionLoading(false);
  };

  const fetchUserMessages = async (userId: string) => {
    setMessagesLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
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
      const durations: Record<string, number> = {
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };

      if (currentAdminRole === 'SuperAdmin') {
        if (banDuration === 'permanent') {
          bannedUntil = '9999-12-31T23:59:59Z';
          durationLabel = "PERMANENT";
        } else if (banDuration === 'custom' && customDate) {
          bannedUntil = new Date(customDate).toISOString();
          durationLabel = `Custom (${new Date(customDate).toLocaleString()})`;
        } else if (durations[banDuration]) {
          bannedUntil = new Date(now.getTime() + durations[banDuration]).toISOString();
          durationLabel = banDuration.replace('m', ' Minutes').replace('h', ' Hours').replace('d', ' Day').replace('7d', '1 Week');
        } else {
           // Default CLI or modal duration fallback
           bannedUntil = new Date(now.getTime() + 3600000).toISOString();
           durationLabel = "1 Hour";
        }
      } else {
        const requestedDuration = durations[banDuration] || durations['1h'];
        const safeDuration = Math.min(requestedDuration, durations['1d']);
        bannedUntil = new Date(now.getTime() + safeDuration).toISOString();
        durationLabel = banDuration.replace('m', ' Minutes').replace('h', ' Hours').replace('d', ' Day');
      }
    }

    const logDetails = isBan 
      ? `${currentAdminName} banned ${user.full_name || user.username} for [${banReason || 'Unspecified Reason'}] for [${durationLabel}]`
      : `${currentAdminName} unbanned ${user.full_name || user.username}`;

    if (isSupabaseConfigured) {
      try {
        const { error: updateError } = await supabase.from('profiles').update({ 
          banned: isBan, 
          banned_until: bannedUntil,
          reason: isBan ? banReason : null
        }).eq('id', user.id);

        if (updateError) throw updateError;

        await supabase.from('admin_logs').insert({ 
          action: isBan ? 'BAN' : 'UNBAN', 
          target_id: user.id, 
          details: logDetails 
        });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      const allUsers = stored ? JSON.parse(stored) : MOCK_USERS;
      const updatedAll = allUsers.map((u: any) => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, banned_until: bannedUntil } : u);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updatedAll));
      
      const storedLogs = JSON.parse(localStorage.getItem('nexus_demo_logs') || '[]');
      storedLogs.unshift({
        id: Math.random().toString(),
        admin_id: currentAdminId,
        action_type: isBan ? 'BAN' : 'UNBAN',
        details: logDetails,
        created_at: new Date().toISOString(),
        target_user: user,
        target_user_id: user.id
      });
      localStorage.setItem('nexus_demo_logs', JSON.stringify(storedLogs));
      fetchData();
    }
    
    if (selectedUser?.id === user.id) {
        setSelectedUser(prev => prev ? { ...prev, banned: isBan, reason: isBan ? banReason : null, banned_until: bannedUntil } : null);
    }

    window.dispatchEvent(new CustomEvent('nexus-toast', { 
      detail: { 
        title: 'SECURITY ACTION', 
        message: logDetails, 
        type: isBan ? 'error' : 'success' 
      } 
    }));

    setShowBanModal(null);
    setBanReason('');
    setIsActionLoading(false);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    setIsActionLoading(true);
    const logDetails = `${currentAdminName} purged records for ${user.full_name || user.username} permanently.`;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.from('admin_logs').insert({ 
          action: 'DELETE_USER', 
          target_id: user.id, 
          details: logDetails 
        });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      const storedLogs = JSON.parse(localStorage.getItem('nexus_demo_logs') || '[]');
      storedLogs.unshift({
        id: Math.random().toString(),
        admin_id: currentAdminId,
        action_type: 'DELETE_USER',
        details: logDetails,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('nexus_demo_logs', JSON.stringify(storedLogs));
    }

    window.dispatchEvent(new CustomEvent('nexus-toast', { 
      detail: { 
        title: 'TERMINAL ACTION', 
        message: logDetails, 
        type: 'warning' 
      } 
    }));

    setShowDeleteModal(null);
    setSelectedUser(null);
    setIsActionLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
      <div className="xl:col-span-4 flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase text-white">Identity Hub</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Managing Real Identities & Security Nodes</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search names, usernames..." 
                className="bg-slate-950 border border-slate-800 rounded-3xl pl-14 pr-8 py-4 text-base focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 w-80 transition-all text-white outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] overflow-hidden backdrop-blur-3xl flex flex-col shadow-2xl min-h-[600px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20">
               <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
               <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Accessing Mainframe...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
               <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600">
                  <UserPlus size={40} />
               </div>
               <h3 className="text-2xl font-black text-white uppercase mb-2">No Records Detected</h3>
               <p className="text-slate-500 text-sm font-bold uppercase tracking-widest max-w-sm mb-8">The identity database is currently empty. Would you like to seed initial test records?</p>
               {isSupabaseConfigured && (
                 <button onClick={seedData} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20">
                   {isActionLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Seed Initial Data'}
                 </button>
               )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-900/95 sticky top-0 z-10">
                  <tr className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] border-b border-slate-800/80">
                    <th className="px-12 py-8">Real Identity</th>
                    <th className="px-12 py-8">Security Node</th>
                    <th className="px-12 py-8">Status</th>
                    <th className="px-12 py-8 text-right">Last Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => { setSelectedUser(user); fetchUserMessages(user.id); }}
                      className="hover:bg-indigo-600/10 cursor-pointer transition-all group"
                    >
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-6">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(user.id)}`} 
                            className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-slate-800 group-hover:border-indigo-500 transition-all p-1.5 shadow-lg" 
                          />
                          <div>
                            <p className="text-lg font-black text-slate-100 uppercase tracking-tight">{user.full_name || 'UNDEFINED'}</p>
                            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-3">
                          <Mail className="text-slate-700" size={14} />
                          <span className="text-xs text-slate-400 font-mono">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-4">
                          {user.banned ? (
                            <span className="px-5 py-2 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">BANNED</span>
                          ) : (
                            <span className="px-5 py-2 rounded-2xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20">AUTHORIZED</span>
                          )}
                          <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-700'}`}></div>
                        </div>
                      </td>
                      <td className="px-12 py-8 text-right">
                         <p className="text-xs text-slate-500 font-mono font-bold">{new Date(user.created_at).toLocaleDateString()}</p>
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
          <div className="sticky top-10 flex flex-col space-y-8">
            <div className="flex items-center gap-4 px-2">
                <History className="text-indigo-500" size={28} />
                <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Audits</h3>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 backdrop-blur-3xl shadow-2xl max-h-[700px] overflow-y-auto custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-center py-20 text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Zero Audit Logs</p>
                ) : logs.map((log) => (
                    <div key={log.id} className="mb-6 p-5 bg-slate-950/40 rounded-3xl border border-slate-800/50 hover:border-indigo-500/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <LogIcon type={log.action_type} />
                                <span className="text-[10px] font-black uppercase text-indigo-400">{log.action_type}</span>
                            </div>
                            <span className="text-[9px] text-slate-600 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{log.details}</p>
                    </div>
                ))}
            </div>
          </div>
      </div>

      {/* User Detail Overlay */}
      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8 bg-slate-950/98 backdrop-blur-3xl">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[3rem] md:rounded-[5rem] w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-bottom-12">
            
            <div className="w-full md:w-[400px] bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-10 md:p-16 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
                <button onClick={() => setSelectedUser(null)} className="absolute top-10 left-10 p-4 bg-slate-800 rounded-2xl text-slate-400 hover:bg-slate-700 transition-all"><X size={20} /></button>
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(selectedUser.id)}`} className="w-40 h-40 rounded-[3rem] bg-slate-900 border-4 border-slate-800 p-4 mb-10 shadow-2xl" />
                <h3 className="text-4xl font-black text-white mb-2 uppercase leading-none tracking-tighter">{selectedUser.full_name || selectedUser.username}</h3>
                <p className="text-slate-500 font-bold text-xs uppercase mb-12 tracking-widest">ID: {String(selectedUser.id).slice(0, 12)}</p>

                <div className="w-full space-y-4 mb-auto">
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 flex items-center gap-5">
                        <Mail className="text-indigo-500" size={20} />
                        <div className="text-left overflow-hidden">
                            <p className="text-[10px] font-black text-slate-600 uppercase">Registered Email</p>
                            <p className="text-sm font-bold text-slate-300 truncate">{selectedUser.email}</p>
                        </div>
                    </div>
                    {selectedUser.banned && (
                        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 text-left">
                             <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="text-rose-500" size={18} />
                                <p className="text-[10px] font-black text-rose-500 uppercase">Suspension Active</p>
                             </div>
                             <p className="text-xs font-bold text-rose-200">{selectedUser.reason || 'Security Violation'}</p>
                             <p className="text-[9px] text-rose-400 font-mono mt-2 uppercase">Ends: {selectedUser.banned_until ? new Date(selectedUser.banned_until).toLocaleString() : 'PERMANENT'}</p>
                        </div>
                    )}
                </div>

                <div className="w-full grid grid-cols-1 gap-4 mt-10">
                    {selectedUser.banned ? (
                        <button onClick={() => handleAction(selectedUser, false)} className="py-6 bg-emerald-600 rounded-[2rem] font-black text-xs uppercase text-white hover:bg-emerald-500 shadow-2xl transition-all"><Unlock size={18} className="inline mr-2" /> Restore Access</button>
                    ) : (
                        <button onClick={() => setShowBanModal(selectedUser)} className="py-6 bg-rose-600 rounded-[2rem] font-black text-xs uppercase text-white hover:bg-rose-500 shadow-2xl transition-all"><UserX size={18} className="inline mr-2" /> Revoke Access</button>
                    )}
                    <button onClick={() => setShowDeleteModal(selectedUser)} className="py-6 bg-slate-800 rounded-[2rem] font-black text-xs uppercase text-slate-400 hover:bg-rose-700 hover:text-white transition-all"><Trash2 size={18} className="inline mr-2" /> Purge Records</button>
                </div>
            </div>

            <div className="flex-1 p-10 md:p-20 flex flex-col bg-slate-900/30 overflow-hidden">
                <div className="flex items-center gap-6 mb-12">
                    <MessageSquare className="text-indigo-500" size={32} />
                    <h4 className="text-3xl font-black uppercase text-white tracking-tighter">Transmission History</h4>
                    <div className="h-px flex-1 bg-slate-800"></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
                    {messagesLoading ? (
                        <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-800/40 rounded-[2.5rem]"></div><div className="h-32 bg-slate-800/40 rounded-[2.5rem]"></div></div>
                    ) : userMessages.length === 0 ? (
                        <div className="py-40 text-center opacity-10 uppercase font-black tracking-[0.5em] text-2xl">Zero Comms History</div>
                    ) : userMessages.map(msg => (
                        <div key={msg.id} className="p-10 bg-slate-950/40 border border-slate-800/80 rounded-[3rem] hover:border-indigo-500/30 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">PACKET: {String(msg.id).slice(0, 8)}</span>
                                <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-lg text-slate-300 font-medium leading-relaxed italic">"{msg.content}"</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Improved Ban Modal (Scrollable Content) */}
      {showBanModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8 bg-slate-950/95 backdrop-blur-2xl">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[4rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-10 md:p-16 overflow-y-auto custom-scrollbar flex-1">
                <div className="w-24 h-24 bg-rose-600/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-rose-500/20">
                    <ShieldAlert size={48} />
                </div>
                <h3 className="text-4xl font-black text-center text-white mb-6 uppercase">Restriction Protocol</h3>
                <p className="text-slate-500 font-bold text-center text-sm uppercase mb-10">Suspending <strong className="text-white">{showBanModal.full_name || showBanModal.username}</strong></p>

                <div className="space-y-8">
                    <div className="text-left">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 px-2 tracking-widest">Reason for Restriction</label>
                        <textarea 
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Reasoning (e.g., Compromised account, ToS violation)..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 text-white focus:border-indigo-500 outline-none h-32 resize-none font-medium text-sm transition-all"
                        />
                    </div>

                    <div className="text-left">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 px-2 tracking-widest">Select Term</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setBanDuration('30m')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === '30m' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>30 Minutes</button>
                            <button onClick={() => setBanDuration('1h')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === '1h' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>1 Hour</button>
                            <button onClick={() => setBanDuration('12h')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === '12h' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>12 Hours</button>
                            <button onClick={() => setBanDuration('1d')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === '1d' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>1 Day</button>
                            
                            {currentAdminRole === 'SuperAdmin' && (
                                <>
                                    <button onClick={() => setBanDuration('7d')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === '7d' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>1 Week</button>
                                    <button onClick={() => setBanDuration('permanent')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === 'permanent' ? 'bg-rose-600 border-rose-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>Permanent</button>
                                    <button onClick={() => setBanDuration('custom')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${banDuration === 'custom' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>Custom</button>
                                    {banDuration === 'custom' && (
                                        <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-xs mt-2 focus:border-indigo-500 outline-none" />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 mt-12">
                    <button onClick={() => { setShowBanModal(null); }} className="flex-1 py-8 bg-slate-800 hover:bg-slate-700 rounded-3xl text-xs font-black uppercase tracking-widest text-slate-400 transition-all border border-slate-700">Abort</button>
                    <button 
                        onClick={() => handleAction(showBanModal, true)} 
                        disabled={isActionLoading || !banReason.trim()}
                        className="flex-1 py-8 bg-rose-600 hover:bg-rose-500 rounded-3xl text-xs font-black uppercase tracking-widest text-white shadow-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95"
                    >
                        {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Restriction'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-8 bg-slate-950/98 backdrop-blur-3xl">
          <div className="bg-slate-950 border border-rose-500/30 p-20 rounded-[4rem] w-full max-w-xl text-center shadow-2xl animate-in zoom-in-95">
            <AlertTriangle size={80} className="text-rose-600 mx-auto mb-10 animate-pulse" />
            <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter text-rose-500">Terminal Deletion</h3>
            <p className="text-slate-400 font-bold text-base mb-16 leading-relaxed uppercase tracking-widest">Wipe identity <strong className="text-white">{showDeleteModal.full_name || showDeleteModal.username}</strong> from the database? This is permanent.</p>
            <div className="flex gap-6">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-8 bg-slate-900 rounded-3xl text-xs font-black uppercase tracking-widest text-slate-500 border border-slate-800">Cancel</button>
                <button onClick={() => handleDeleteUser(showDeleteModal)} className="flex-1 py-8 bg-rose-700 hover:bg-rose-600 rounded-3xl text-xs font-black uppercase tracking-widest text-white shadow-2xl transition-all">Execute Purge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
