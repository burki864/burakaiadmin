
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, UserX, UserCheck, Loader2, ShieldAlert, History, Trash2, Shield, Settings, LogIn, Unlock, RefreshCcw, AlertTriangle, X, MessageSquare, Calendar, Mail, Fingerprint, Info, Clock, ShieldCheck } from 'lucide-react';
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

  const [showBanModal, setShowBanModal] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<string>('1d'); // Default duration
  const [showDeleteModal, setShowDeleteModal] = useState<UserProfile | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Get current admin role from session
  const rawSession = localStorage.getItem('nexus_demo_session');
  const session = rawSession ? JSON.parse(rawSession) : null;
  const adminRole = session?.user?.role || 'Moderator';
  const isSuperAdmin = adminRole === 'SuperAdmin';

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
          .limit(10);
        if (data) setUserMessages(data as Message[]);
      } catch (e) { console.error(e); }
    } else {
      setUserMessages([
        { id: 'm1', user_id: userId, content: 'Identity verified. Integrity sweep complete.', created_at: new Date().toISOString() },
        { id: 'm2', user_id: userId, content: 'Broadcasting from Sector 7.', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'm3', user_id: userId, content: 'Historical packet log data reconstructed.', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 'm4', user_id: userId, content: 'System status: Nominal.', created_at: new Date(Date.now() - 172800000).toISOString() },
        { id: 'm5', user_id: userId, content: 'Legacy signal detected.', created_at: new Date(Date.now() - 259200000).toISOString() },
      ]);
    }
    setMessagesLoading(false);
  };

  const calculateUntil = (duration: string) => {
    if (duration === 'permanent') return null;
    const now = Date.now();
    switch(duration) {
        case '1h': return new Date(now + 3600000).toISOString();
        case '1d': return new Date(now + 86400000).toISOString();
        case '7d': return new Date(now + 604800000).toISOString();
        case '30d': return new Date(now + 2592000000).toISOString();
        default: return new Date(now + 86400000).toISOString();
    }
  }

  const handleAction = async (user: UserProfile, isBan: boolean) => {
    setIsActionLoading(true);
    
    // Safety check for Moderators
    const finalDuration = !isSuperAdmin ? '1d' : banDuration;
    const banUntil = isBan ? calculateUntil(finalDuration) : null;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ 
          banned: isBan, 
          banned_until: banUntil,
          reason: isBan ? banReason : null
        }).eq('id', user.id);

        await supabase.from('admin_logs').insert({ 
          action: isBan ? 'BAN' : 'UNBAN', 
          target_id: user.id, 
          details: `${isBan ? 'Terminated' : 'Reinstated'} access for ${user.username}. Duration: ${finalDuration}. Reason: ${banReason}` 
        });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      const allUsers = stored ? JSON.parse(stored) : MOCK_USERS;
      const updatedAll = allUsers.map((u: any) => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, ban_until: banUntil } : u);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updatedAll));
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, ban_until: banUntil } : u));
      window.dispatchEvent(new Event('nexus-auth-refresh'));
    }
    
    if (selectedUser?.id === user.id) {
        setSelectedUser(prev => prev ? { ...prev, banned: isBan, reason: isBan ? banReason : null, ban_until: banUntil } : null);
    }

    setShowBanModal(null);
    setBanReason('');
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
          details: `Permanently purged identity record for ${user.username}` 
        });
        fetchData();
      } catch (e) { console.error(e); }
    } else {
      const stored = localStorage.getItem('nexus_demo_users');
      const allUsers = stored ? JSON.parse(stored) : MOCK_USERS;
      const updatedAll = allUsers.filter((u: any) => u.id !== user.id);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updatedAll));
      setUsers(prev => prev.filter(u => u.id !== user.id));
      window.dispatchEvent(new Event('nexus-auth-refresh'));
    }
    setShowDeleteModal(null);
    setSelectedUser(null);
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
            <h2 className="text-5xl font-black tracking-tighter mb-2 uppercase text-white">Identity Hub</h2>
            <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isSuperAdmin ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    Clearance: {adminRole}
                </span>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.3em]">Operational Grid Managed by {session?.user?.name || 'Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-slate-400">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Database..." 
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
                  <th className="px-12 py-8">Identity Signal</th>
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
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={4} className="px-12 py-60 text-center text-slate-700 font-black uppercase tracking-[0.5em] italic">No Records found</td></tr>
                ) : (
                  filteredUsers.map((user) => (
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
                          <div className={`w-3 h-3 rounded-full ${user.status === 'online' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${user.status === 'online' ? 'text-emerald-500' : 'text-slate-600'}`}>{user.status || 'Offline'}</span>
                        </div>
                      </td>
                      <td className="px-12 py-8">
                        {user.banned ? (
                          <span className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase border border-rose-500/20 shadow-lg">
                            <ShieldAlert size={14} /> TERMINATED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20 shadow-lg">
                            <UserCheck size={14} /> AUTHORIZED
                          </span>
                        )}
                      </td>
                      <td className="px-12 py-8 text-right">
                         <p className="text-xs text-slate-500 font-mono">{new Date(user.created_at).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="xl:col-span-1 flex flex-col space-y-8 sticky top-10 h-fit">
        <div className="flex items-center gap-4 px-2">
          <History className="text-indigo-500" size={28} />
          <h3 className="text-xl font-black tracking-tighter uppercase tracking-[0.2em] text-white">Live Audits</h3>
        </div>
        
        <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 flex flex-col backdrop-blur-3xl shadow-2xl max-h-[700px] overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
            {logs.length === 0 ? (
              <div className="text-center py-20 opacity-20"><Shield size={40} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">No Events</p></div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-5 bg-slate-950/40 rounded-[2rem] border border-slate-800/50 hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <LogIcon type={log.action_type} />
                      <span className="text-[10px] font-black uppercase text-indigo-400">{log.action_type}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-tight">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Profile Detail View Overlay - WITH SCROLLING */}
      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={() => setSelectedUser(null)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-[3rem] md:rounded-[5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-12 duration-500 shadow-2xl">
            
            {/* Left Info Panel - Scrollable */}
            <div className="w-full md:w-[400px] bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-10 md:p-16 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-6 left-6 md:top-10 md:left-10 p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all text-slate-400"
                >
                    <X size={20} />
                </button>

                <img 
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUser.id}`} 
                    className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[3rem] bg-slate-900 border-4 border-slate-800 p-4 mb-8 md:mb-10 shadow-2xl" 
                />
                
                <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-2 uppercase">{selectedUser.username}</h3>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-8 md:mb-12">REF_ID: {selectedUser.id.slice(0, 12)}</p>

                <div className="w-full space-y-4 mb-8">
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800/80 flex items-center gap-5">
                        <Mail className="text-indigo-500" size={20} />
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Email Uplink</p>
                            <p className="text-sm font-bold text-slate-300 truncate max-w-[180px]">{selectedUser.email}</p>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-slate-800/80 flex items-center gap-5">
                        <Calendar className="text-indigo-500" size={20} />
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Identity Created</p>
                            <p className="text-sm font-bold text-slate-300">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    {selectedUser.banned && (
                        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 text-left">
                             <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="text-rose-500" size={18} />
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Suspension Active</p>
                             </div>
                             <p className="text-sm font-bold text-rose-200 mb-2">{selectedUser.reason || 'Safety restriction active.'}</p>
                             <div className="flex items-center gap-2 text-[10px] text-rose-400 font-mono bg-rose-500/5 p-2 rounded-lg">
                                <Clock size={12} />
                                Expires: {selectedUser.ban_until ? new Date(selectedUser.ban_until).toLocaleString() : 'PERMANENT'}
                             </div>
                        </div>
                    )}
                </div>

                <div className="w-full grid grid-cols-1 gap-4">
                    {selectedUser.banned ? (
                        <button 
                            onClick={() => handleAction(selectedUser, false)}
                            className="py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl"
                        >
                            <Unlock size={18} /> Reinstate Access
                        </button>
                    ) : (
                        <button 
                            onClick={() => setShowBanModal(selectedUser)}
                            className="py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl"
                        >
                            <UserX size={18} /> Initiate Ban
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setShowDeleteModal(selectedUser)}
                            className="py-6 bg-slate-800 hover:bg-rose-700 text-slate-400 hover:text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                        >
                            <Trash2 size={18} /> Purge Identity
                        </button>
                    )}
                </div>
            </div>

            {/* Right Activity Panel - Scrollable */}
            <div className="flex-1 p-8 md:p-20 flex flex-col bg-slate-900/30 overflow-hidden">
                <div className="flex items-center gap-6 mb-12">
                    <MessageSquare className="text-indigo-500" size={32} />
                    <h4 className="text-3xl font-black tracking-tighter uppercase text-white">Broadcast History</h4>
                    <div className="h-px flex-1 bg-slate-800"></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
                    {messagesLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-slate-800/40 rounded-[2.5rem] animate-pulse"></div>)
                    ) : userMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-10 py-20">
                            <Info size={100} className="mb-6" />
                            <p className="text-2xl font-black uppercase tracking-[0.5em]">No Data Packets</p>
                        </div>
                    ) : (
                        userMessages.map(msg => (
                            <div key={msg.id} className="p-8 md:p-10 bg-slate-950/40 border border-slate-800/80 rounded-[2.5rem] md:rounded-[3rem] hover:border-indigo-500/30 transition-all group">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Signal Ref: {msg.id.slice(0, 8)}</span>
                                    <span className="text-[10px] text-slate-600 font-mono font-bold uppercase">{new Date(msg.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-base md:text-lg text-slate-300 leading-relaxed font-medium">"{msg.content}"</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Improved Ban Modal with Duration Logic and Clearance Checks */}
      {showBanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-8">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => { setShowBanModal(null); setBanReason(''); }}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-[3rem] md:rounded-[5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-500 shadow-[0_0_150px_rgba(0,0,0,0.9)]">
            <div className="p-10 md:p-20 text-center">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-rose-600/10 text-rose-500 rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center mx-auto mb-10 border border-rose-500/20 shadow-2xl">
                <ShieldAlert size={64} />
              </div>
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter mb-6 uppercase text-white">Security Breach Protocol</h3>
              <p className="text-slate-500 font-bold text-sm md:text-base mb-10 leading-relaxed max-w-sm mx-auto">
                Restriction of privileges for <strong className="text-white">@{showBanModal.username}</strong>. Operational Clearance: <span className="text-indigo-400">{adminRole}</span>.
              </p>

              <div className="mb-10 text-left">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-4 mb-3">Termination Reason (Mandatory)</label>
                  <textarea 
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Describe specific policy violations..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] p-6 md:p-8 text-white focus:border-indigo-500 outline-none transition-all resize-none h-32 md:h-40 font-medium text-sm"
                  />
              </div>

              {/* DURATION SELECTOR */}
              <div className="mb-12 text-left">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-4 mb-4">Restriction Duration</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {isSuperAdmin ? (
                          <>
                            {[
                                { id: '1h', label: '1 Hour' },
                                { id: '1d', label: '1 Day' },
                                { id: '7d', label: '1 Week' },
                                { id: '30d', label: '1 Month' },
                                { id: 'permanent', label: 'Permanent' }
                            ].map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setBanDuration(d.id)}
                                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${banDuration === d.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                >
                                    {d.label}
                                </button>
                            ))}
                          </>
                      ) : (
                          // Moderator Restricted View
                          <div className="col-span-3 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <Clock className="text-indigo-500" size={20} />
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Limited Access</p>
                                    <p className="text-sm font-bold text-white uppercase">1 Day Time Ban Only</p>
                                </div>
                             </div>
                             <ShieldCheck className="text-slate-700" size={24} />
                          </div>
                      )}
                  </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <button onClick={() => { setShowBanModal(null); setBanReason(''); }} className="flex-1 py-6 md:py-8 bg-slate-800 hover:bg-slate-700 rounded-[1.5rem] md:rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] text-slate-400 transition-all">Cancel</button>
                <button 
                  onClick={() => handleAction(showBanModal, true)} 
                  disabled={isActionLoading || !banReason.trim()}
                  className="flex-1 py-6 md:py-8 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 rounded-[1.5rem] md:rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isActionLoading ? <Loader2 className="animate-spin w-6 h-6" /> : `Confirm ${!isSuperAdmin ? '1D' : banDuration === 'permanent' ? 'Perm' : banDuration.toUpperCase()} Ban`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal - WITH SCROLLING */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-8">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={() => setShowDeleteModal(null)}></div>
          <div className="relative bg-slate-950 border border-rose-500/30 rounded-[3rem] md:rounded-[5rem] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="p-10 md:p-20 text-center">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-rose-600/20 text-rose-600 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center mx-auto mb-10 border-2 border-rose-500/30 shadow-2xl animate-pulse">
                <AlertTriangle size={64} />
              </div>
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter mb-6 uppercase text-white">Purge Identity?</h3>
              <p className="text-slate-400 font-bold text-sm md:text-base mb-12 leading-relaxed max-w-md mx-auto">
                Permanently delete all metadata for <strong className="text-rose-500">@{showDeleteModal.username}</strong>. This action bypasses standard safety protocols and is irreversible.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-6 md:py-8 bg-slate-900 hover:bg-slate-800 rounded-[1.5rem] md:rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] text-slate-500 transition-all border border-slate-800">Abort</button>
                <button 
                  onClick={() => handleDeleteUser(showDeleteModal)} 
                  disabled={isActionLoading}
                  className="flex-1 py-6 md:py-8 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 rounded-[1.5rem] md:rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] text-white transition-all flex items-center justify-center gap-3 shadow-2xl border border-rose-500/20 active:scale-95"
                >
                  {isActionLoading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Execute Purge'}
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
