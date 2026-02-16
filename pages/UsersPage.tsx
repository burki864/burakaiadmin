
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, UserX, UserCheck, Loader2, ShieldAlert, History, Trash2, Shield, Unlock, RefreshCcw, AlertTriangle, X, MessageSquare, Calendar, Mail, Info, Clock, ShieldCheck, Lock, Key } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfile, AdminLog, Message } from '../types.ts';

const MOCK_USERS: UserProfile[] = [
  { id: 'nexus-admin-master', username: 'Burak', email: 'master@nexus.admin', banned: false, ban_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '1', username: 'kaito_admin', email: 'kaito@nexus.io', banned: false, ban_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '2', username: 'shadow_user', email: 'shadow@dark.net', banned: true, ban_until: '2026-01-01T00:00:00Z', reason: 'Repeated policy violations (Spam)', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'offline' },
  { id: '3', username: 'beta_tester', email: 'tester@google.com', banned: false, ban_until: null, created_at: new Date(Date.now() - 259200000).toISOString(), status: 'offline' },
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

  // Clearance States
  const [showClearanceModal, setShowClearanceModal] = useState<{user: UserProfile, isBan: boolean} | null>(null);
  const [clearancePassword, setClearancePassword] = useState('');
  const [clearanceLevel, setClearanceLevel] = useState<'super' | 'mod' | null>(null);

  // Ban States
  const [showBanModal, setShowBanModal] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('1d');
  const [customDate, setCustomDate] = useState<string>('');
  
  const [showDeleteModal, setShowDeleteModal] = useState<UserProfile | null>(null);
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
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (lData) {
          const formatted = lData.map(l => ({
            ...l,
            action_type: l.action || 'INFO',
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
        { id: 'm1', user_id: userId, content: 'Identity verified. Integrity sweep complete.', created_at: new Date().toISOString() },
        { id: 'm2', user_id: userId, content: 'Broadcasting from Sector 7.', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'm3', user_id: userId, content: 'Historical packet log data reconstructed.', created_at: new Date(Date.now() - 86400000).toISOString() },
      ]);
    }
    setMessagesLoading(false);
  };

  const verifyClearance = (e: React.FormEvent) => {
    e.preventDefault();
    if (clearancePassword === 'burakisbest') {
      setClearanceLevel('super');
      if (showClearanceModal?.isBan) {
        setShowBanModal(showClearanceModal.user);
      } else {
        handleAction(showClearanceModal!.user, false);
      }
      setShowClearanceModal(null);
      setClearancePassword('');
    } else if (clearancePassword.length > 0) {
      setClearanceLevel('mod');
      if (showClearanceModal?.isBan) {
        setShowBanModal(showClearanceModal.user);
      } else {
        handleAction(showClearanceModal!.user, false);
      }
      setShowClearanceModal(null);
      setClearancePassword('');
    }
  };

  const handleAction = async (user: UserProfile, isBan: boolean) => {
    setIsActionLoading(true);
    let banUntil: string | null = null;

    if (isBan) {
      const now = new Date();
      if (clearanceLevel === 'super') {
        if (banDuration === 'permanent') banUntil = '9999-12-31T23:59:59Z';
        else if (banDuration === 'custom' && customDate) banUntil = new Date(customDate).toISOString();
        else if (banDuration === '1h') banUntil = new Date(now.getTime() + 3600000).toISOString();
        else if (banDuration === '1d') banUntil = new Date(now.getTime() + 86400000).toISOString();
      } else {
        // Moderator restricted to 1 day
        banUntil = new Date(now.getTime() + 86400000).toISOString();
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ 
          banned: isBan, 
          ban_until: banUntil,
          reason: isBan ? banReason : null
        }).eq('id', user.id);

        await supabase.from('admin_logs').insert({ 
          action: isBan ? 'BAN' : 'UNBAN', 
          target_id: user.id, 
          details: `${isBan ? 'Suspended' : 'Reinstated'} ${user.username}. Reason: ${banReason || 'N/A'}` 
        });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      const allUsers = stored ? JSON.parse(stored) : MOCK_USERS;
      const updatedAll = allUsers.map((u: any) => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, ban_until: banUntil } : u);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updatedAll));
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, ban_until: banUntil } : u));
    }
    
    if (selectedUser?.id === user.id) {
        setSelectedUser(prev => prev ? { ...prev, banned: isBan, reason: isBan ? banReason : null, ban_until: banUntil } : null);
    }

    setShowBanModal(null);
    setBanReason('');
    setIsActionLoading(false);
    setClearanceLevel(null);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    setIsActionLoading(true);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      setUsers(prev => prev.filter(u => u.id !== user.id));
    }
    setShowDeleteModal(null);
    setSelectedUser(null);
    setIsActionLoading(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-10">
      <div className="xl:col-span-4 flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase text-white">Identity Hub</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Select a profile to manage security status</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search database..." 
                className="bg-slate-950 border border-slate-800 rounded-3xl pl-14 pr-8 py-4 text-base focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 w-80 transition-all text-white outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] overflow-hidden backdrop-blur-3xl flex flex-col shadow-2xl min-h-[600px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-900/95 sticky top-0 z-10">
                <tr className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] border-b border-slate-800/80">
                  <th className="px-12 py-8">Signal</th>
                  <th className="px-12 py-8">Connection</th>
                  <th className="px-12 py-8">Status</th>
                  <th className="px-12 py-8 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading && users.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-12 py-10"><div className="h-12 bg-slate-800/40 rounded-3xl w-full"></div></td>
                    </tr>
                  ))
                ) : users.filter(u => u.username.toLowerCase().includes(search.toLowerCase())).map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => { setSelectedUser(user); fetchUserMessages(user.id); }}
                    className="hover:bg-indigo-600/10 cursor-pointer transition-all group"
                  >
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-6">
                        <img 
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} 
                          className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-slate-800 group-hover:border-indigo-500 transition-all p-1.5" 
                        />
                        <div>
                          <p className="text-lg font-bold text-slate-100">{user.username}</p>
                          <p className="text-xs text-slate-500 font-mono tracking-tighter">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-black uppercase text-slate-500">{user.status || 'Offline'}</span>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      {user.banned ? (
                        <span className="px-5 py-2 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase border border-rose-500/20">SUSPENDED</span>
                      ) : (
                        <span className="px-5 py-2 rounded-2xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20">ACTIVE</span>
                      )}
                    </td>
                    <td className="px-12 py-8 text-right">
                       <p className="text-xs text-slate-500 font-mono">{new Date(user.created_at).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="xl:col-span-1">
          <div className="sticky top-10 flex flex-col space-y-8">
            <div className="flex items-center gap-4 px-2">
                <History className="text-indigo-500" size={28} />
                <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Audits</h3>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 backdrop-blur-3xl shadow-2xl max-h-[700px] overflow-y-auto custom-scrollbar">
                {logs.map((log) => (
                    <div key={log.id} className="mb-6 p-5 bg-slate-950/40 rounded-3xl border border-slate-800/50">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <LogIcon type={log.action_type} />
                                <span className="text-[10px] font-black uppercase text-indigo-400">{log.action_type}</span>
                            </div>
                            <span className="text-[9px] text-slate-600 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{log.details}</p>
                    </div>
                ))}
            </div>
          </div>
      </div>

      {/* Clearance Gate Modal */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-[4rem] w-full max-w-md shadow-2xl">
                <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
                    <Key size={32} className="text-indigo-500" />
                </div>
                <h3 className="text-3xl font-black text-center text-white mb-4 uppercase">Verification Required</h3>
                <p className="text-slate-500 text-center font-bold text-xs uppercase mb-10">Enter administrative token to proceed</p>
                <form onSubmit={verifyClearance} className="space-y-6">
                    <div className="relative">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                        <input 
                            type="password"
                            value={clearancePassword}
                            onChange={(e) => setClearancePassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-3xl py-6 pl-16 pr-6 text-white focus:border-indigo-500 outline-none"
                            placeholder="ADMIN_PASSCODE"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={() => setShowClearanceModal(null)} className="flex-1 py-6 bg-slate-800 rounded-3xl text-xs font-black uppercase text-slate-400 hover:bg-slate-700 transition-all">Cancel</button>
                        <button type="submit" className="flex-1 py-6 bg-indigo-600 rounded-3xl text-xs font-black uppercase text-white hover:bg-indigo-500 transition-all">Engage</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* User Detail Overlay - Fixed TypeError and Added Scrolling */}
      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8 bg-slate-950/98 backdrop-blur-3xl">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[3rem] md:rounded-[5rem] w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-bottom-12">
            
            {/* Left Info Panel (Scrollable) */}
            <div className="w-full md:w-[400px] bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-10 md:p-16 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
                <button onClick={() => setSelectedUser(null)} className="absolute top-10 left-10 p-4 bg-slate-800 rounded-2xl text-slate-400 hover:bg-slate-700"><X size={20} /></button>
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.id}`} className="w-40 h-40 rounded-[3rem] bg-slate-900 border-4 border-slate-800 p-4 mb-10 shadow-2xl" />
                <h3 className="text-4xl font-black text-white mb-2 uppercase">{selectedUser.username}</h3>
                <p className="text-slate-500 font-bold text-xs uppercase mb-12">REF: {String(selectedUser.id).slice(0, 12)}</p>

                <div className="w-full space-y-4 mb-auto">
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800 flex items-center gap-5">
                        <Mail className="text-indigo-500" size={20} />
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-600 uppercase">Uplink</p>
                            <p className="text-sm font-bold text-slate-300 truncate w-40">{selectedUser.email}</p>
                        </div>
                    </div>
                    {selectedUser.banned && (
                        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 text-left">
                             <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="text-rose-500" size={18} />
                                <p className="text-[10px] font-black text-rose-500 uppercase">Suspension Active</p>
                             </div>
                             <p className="text-xs font-bold text-rose-200">{selectedUser.reason || 'N/A'}</p>
                             <p className="text-[9px] text-rose-400 font-mono mt-2">Ends: {selectedUser.ban_until ? new Date(selectedUser.ban_until).toLocaleString() : 'PERMANENT'}</p>
                        </div>
                    )}
                </div>

                <div className="w-full grid grid-cols-1 gap-4 mt-10">
                    {selectedUser.banned ? (
                        <button onClick={() => setShowClearanceModal({user: selectedUser, isBan: false})} className="py-6 bg-emerald-600 rounded-[2rem] font-black text-xs uppercase text-white hover:bg-emerald-500 shadow-2xl"><Unlock size={18} className="inline mr-2" /> Reinstate</button>
                    ) : (
                        <button onClick={() => setShowClearanceModal({user: selectedUser, isBan: true})} className="py-6 bg-rose-600 rounded-[2rem] font-black text-xs uppercase text-white hover:bg-rose-500 shadow-2xl"><UserX size={18} className="inline mr-2" /> Suspend</button>
                    )}
                    <button onClick={() => setShowDeleteModal(selectedUser)} className="py-6 bg-slate-800 rounded-[2rem] font-black text-xs uppercase text-slate-400 hover:bg-rose-700 hover:text-white transition-all"><Trash2 size={18} className="inline mr-2" /> Purge</button>
                </div>
            </div>

            {/* Right Activity Panel (Scrollable) */}
            <div className="flex-1 p-10 md:p-20 flex flex-col bg-slate-900/30 overflow-hidden">
                <div className="flex items-center gap-6 mb-12">
                    <MessageSquare className="text-indigo-500" size={32} />
                    <h4 className="text-3xl font-black uppercase text-white">Broadcast History</h4>
                    <div className="h-px flex-1 bg-slate-800"></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
                    {messagesLoading ? (
                        <div className="animate-pulse space-y-4"><div className="h-32 bg-slate-800/40 rounded-[2.5rem]"></div><div className="h-32 bg-slate-800/40 rounded-[2.5rem]"></div></div>
                    ) : userMessages.map(msg => (
                        <div key={msg.id} className="p-10 bg-slate-950/40 border border-slate-800/80 rounded-[3rem] hover:border-indigo-500/30 transition-all">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">SIGNAL_REF: {String(msg.id).slice(0, 8)}</span>
                                <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-lg text-slate-300 font-medium">"{msg.content}"</p>
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
                <p className="text-slate-500 font-bold text-center text-sm uppercase mb-10">Restricting access for <strong className="text-white">@{showBanModal.username}</strong></p>

                <div className="space-y-8">
                    <div className="text-left">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 px-2">Reason (Mandatory)</label>
                        <textarea 
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Describe violation..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 text-white focus:border-indigo-500 outline-none h-32 resize-none font-medium"
                        />
                    </div>

                    <div className="text-left">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 px-2">Duration Level: {clearanceLevel === 'super' ? 'SUPERADMIN' : 'MODERATOR'}</label>
                        <div className="grid grid-cols-2 gap-3">
                            {clearanceLevel === 'super' ? (
                                <>
                                    <button onClick={() => setBanDuration('1h')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border ${banDuration === '1h' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>1 Hour</button>
                                    <button onClick={() => setBanDuration('1d')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border ${banDuration === '1d' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>1 Day</button>
                                    <button onClick={() => setBanDuration('7d')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border ${banDuration === '7d' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>1 Week</button>
                                    <button onClick={() => setBanDuration('permanent')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border ${banDuration === 'permanent' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Permanent</button>
                                    <button onClick={() => setBanDuration('custom')} className={`py-4 rounded-2xl text-[10px] font-black uppercase border ${banDuration === 'custom' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Custom</button>
                                    {banDuration === 'custom' && (
                                        <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-xs mt-2" />
                                    )}
                                </>
                            ) : (
                                <div className="col-span-2 p-6 bg-slate-950/50 border border-slate-800 rounded-3xl flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Fixed Duration</span>
                                    <span className="text-xs font-bold text-white">1 Day Limited Ban</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 mt-12">
                    <button onClick={() => { setShowBanModal(null); setClearanceLevel(null); }} className="flex-1 py-8 bg-slate-800 rounded-3xl text-xs font-black uppercase text-slate-400">Abort</button>
                    <button 
                        onClick={() => handleAction(showBanModal, true)} 
                        disabled={!banReason.trim()}
                        className="flex-1 py-8 bg-rose-600 rounded-3xl text-xs font-black uppercase text-white hover:bg-rose-500 shadow-xl disabled:opacity-30"
                    >
                        Execute Restriction
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
            <h3 className="text-4xl font-black text-white mb-6 uppercase">Confirm Purge?</h3>
            <p className="text-slate-400 font-bold text-base mb-16 leading-relaxed">Permanently delete <strong className="text-rose-500">@{showDeleteModal.username}</strong> from the mainframe. This action is terminal.</p>
            <div className="flex gap-6">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-8 bg-slate-900 rounded-3xl text-xs font-black uppercase text-slate-500 border border-slate-800">Abort</button>
                <button onClick={() => handleDeleteUser(showDeleteModal)} className="flex-1 py-8 bg-rose-700 rounded-3xl text-xs font-black uppercase text-white hover:bg-rose-600 shadow-2xl">Purge Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
