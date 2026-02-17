
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, UserX, UserCheck, Loader2, ShieldAlert, History, Trash2, Shield, Unlock, RefreshCcw, AlertTriangle, X, MessageSquare, Calendar, Mail, Info, Clock, ShieldCheck, Lock, Key, UserPlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfile, AdminLog, Message } from '../types.ts';

const MOCK_USERS: UserProfile[] = [
  { id: 'nexus-admin-master', username: 'burak_admin', full_name: 'Burak Yiğit', email: 'master@nexus.admin', banned: false, banned_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '1', username: 'kaito_dev', full_name: 'Kaito Shion', email: 'kaito@nexus.io', banned: false, banned_until: null, created_at: new Date().toISOString(), status: 'online' },
  { id: '2', username: 'shadow_zero', full_name: 'Security Ghost', email: 'shadow@dark.net', banned: true, banned_until: '2026-01-01T00:00:00Z', reason: 'Policy Violation: Spam', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'offline' },
  { id: '3', username: 'beta_tester_01', full_name: 'Alpha Node', email: 'tester@google.com', banned: false, banned_until: null, created_at: new Date(Date.now() - 259200000).toISOString(), status: 'offline' },
];

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
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const [currentAdmin, setCurrentAdmin] = useState({ name: 'Admin', role: 'Moderator' });

  useEffect(() => {
    const session = localStorage.getItem('nexus_demo_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setCurrentAdmin({
          name: parsed.user?.name || 'Admin',
          role: parsed.user?.role || 'Moderator'
        });
      } catch (e) {}
    }

    const handleCliBan = (e: any) => {
      const { userId, reason } = e.detail;
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        setBanReason(reason || 'CLI Restriction');
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
        const { data: uData } = await uQuery;
        setUsers((uData as UserProfile[]) || []);
      } catch (e) { console.error(e); }
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

  const handleAction = async (user: UserProfile, isBan: boolean) => {
    setIsActionLoading(true);
    let bannedUntil: string | null = null;
    
    if (isBan) {
      const now = new Date();
      if (banDuration === '1h') bannedUntil = new Date(now.getTime() + 3600000).toISOString();
      if (banDuration === '12h') bannedUntil = new Date(now.getTime() + 3600000 * 12).toISOString();
      if (banDuration === '1d') bannedUntil = new Date(now.getTime() + 86400000).toISOString();
      if (banDuration === '7d') bannedUntil = new Date(now.getTime() + 86400000 * 7).toISOString();
      if (banDuration === 'perm') bannedUntil = '9999-12-31T23:59:59Z';
    }

    const logDetails = isBan 
      ? `${currentAdmin.name} restricted @${user.username} (${banDuration}) for: ${banReason}`
      : `${currentAdmin.name} restored access for @${user.username}`;

    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('nexus_demo_users');
      const allUsers = stored ? JSON.parse(stored) : MOCK_USERS;
      const updatedAll = allUsers.map((u: any) => u.id === user.id ? { ...u, banned: isBan, reason: isBan ? banReason : null, banned_until: bannedUntil } : u);
      localStorage.setItem('nexus_demo_users', JSON.stringify(updatedAll));
      
      const storedLogs = JSON.parse(localStorage.getItem('nexus_demo_logs') || '[]');
      storedLogs.unshift({ id: Math.random().toString(), action_type: isBan ? 'BAN' : 'UNBAN', details: logDetails, created_at: new Date().toISOString() });
      localStorage.setItem('nexus_demo_logs', JSON.stringify(storedLogs));
      fetchData();
    }
    
    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { title: 'SECURITY', message: logDetails, type: isBan ? 'error' : 'success' } }));
    setShowBanModal(null); setBanReason(''); setIsActionLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-10">
      <div className="xl:col-span-4 flex flex-col space-y-4 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-xl md:text-5xl font-black tracking-tighter uppercase text-white leading-none">Identity Hub</h2>
            <p className="text-slate-600 font-bold text-[7px] md:text-sm uppercase tracking-widest">Active Nodes</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 md:p-4 bg-slate-900 rounded-lg md:rounded-2xl text-slate-400">
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 w-3 h-3 md:w-5 md:h-5" />
              <input 
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Find node..." 
                className="bg-slate-950 border border-slate-800 rounded-lg md:rounded-3xl pl-8 md:pl-14 py-2 md:py-4 text-[11px] md:text-sm focus:border-indigo-500 w-full md:w-80 outline-none text-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-[1rem] md:rounded-[4rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
          {loading ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/95 sticky top-0 z-10">
                  <tr className="text-slate-600 text-[7px] md:text-[11px] font-black uppercase tracking-widest border-b border-slate-800">
                    <th className="px-3 md:px-12 py-3 md:py-8">Identity</th>
                    <th className="px-3 md:px-12 py-3 md:py-8">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => { setSelectedUser(user); }}
                      className="hover:bg-indigo-600/5 cursor-pointer transition-all group"
                    >
                      <td className="px-3 md:px-12 py-2 md:py-6">
                        <div className="flex items-center gap-3 md:gap-6">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(user.id)}`} 
                            className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-slate-950 border border-slate-800 p-0.5" 
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] md:text-lg font-black text-slate-100 uppercase tracking-tight truncate max-w-[150px] md:max-w-none">
                              {user.full_name || user.username}
                            </p>
                            <p className="text-[6px] md:text-xs text-slate-500 font-bold uppercase">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-12 py-2 md:py-6">
                        <div className="flex items-center gap-2">
                          {user.banned ? (
                            <span className="px-1.5 md:px-5 py-0.5 md:py-2 rounded-md md:rounded-2xl bg-rose-500/10 text-rose-500 text-[6px] md:text-[10px] font-black uppercase border border-rose-500/20">BANNED</span>
                          ) : (
                            <span className="px-1.5 md:px-5 py-0.5 md:py-2 rounded-md md:rounded-2xl bg-emerald-500/10 text-emerald-500 text-[6px] md:text-[10px] font-black uppercase border border-emerald-500/20">AUTH</span>
                          )}
                          <div className={`w-1 md:w-2 h-1 md:h-2 rounded-full ${user.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-1 hidden xl:block">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-6 backdrop-blur-3xl shadow-2xl max-h-[600px] overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Audits</h3>
            <p className="text-[9px] text-slate-600 font-bold uppercase italic">Operational records synced.</p>
          </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-slate-950/95 backdrop-blur-xl">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[1.5rem] md:rounded-[4rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
                <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(selectedUser.id)}`} className="w-20 h-20 md:w-32 md:h-32 rounded-[2rem] bg-slate-950 border border-slate-800 p-2 mb-4" />
                <h3 className="text-xl md:text-3xl font-black text-white mb-1 uppercase tracking-tighter">{selectedUser.full_name || selectedUser.username}</h3>
                <p className="text-slate-500 font-bold text-[8px] md:text-xs uppercase mb-8">@{selectedUser.username}</p>

                <div className="w-full space-y-2 mb-6 text-left">
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <p className="text-[7px] font-black text-slate-600 uppercase mb-1">Email Hash</p>
                        <p className="text-[11px] font-bold text-slate-300 truncate">{selectedUser.email}</p>
                    </div>
                    {selectedUser.banned && (
                      <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                          <p className="text-[7px] font-black text-rose-500 uppercase mb-1">Restriction Data</p>
                          <p className="text-[11px] font-bold text-rose-200 leading-tight">{selectedUser.reason || 'No reason provided'}</p>
                          <p className="text-[8px] text-rose-400 font-mono mt-2 uppercase">Ends: {selectedUser.banned_until ? new Date(selectedUser.banned_until).toLocaleString() : 'PERM'}</p>
                      </div>
                    )}
                </div>

                <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                    {selectedUser.banned ? (
                        <button onClick={() => handleAction(selectedUser, false)} className="py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-[9px] uppercase text-white transition-all">Restore</button>
                    ) : (
                        <button onClick={() => setShowBanModal(selectedUser)} className="py-4 bg-rose-600 hover:bg-rose-500 rounded-xl font-black text-[9px] uppercase text-white transition-all">Ban Target</button>
                    )}
                    <button className="py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-[9px] uppercase text-slate-400">Audit Node</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {showBanModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-2xl">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[4rem] w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Restriction Protocol</h3>
                  <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1">Target: @{showBanModal.username}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[8px] font-black text-slate-600 uppercase mb-2 px-1 tracking-widest">Reason for Restriction</label>
                  <textarea 
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Describe the violation..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none h-24 resize-none text-[11px] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-600 uppercase mb-2 px-1 tracking-widest">Suspension Term</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['1h', '12h', '1d', '7d'].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setBanDuration(d)}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${banDuration === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                      >
                        {d}
                      </button>
                    ))}
                    {currentAdmin.role === 'SuperAdmin' && (
                      <button 
                        onClick={() => setBanDuration('perm')}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${banDuration === 'perm' ? 'bg-rose-600 border-rose-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-700'}`}
                      >
                        PERM
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button onClick={() => { setShowBanModal(null); setBanReason(''); }} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Abort</button>
                <button 
                  onClick={() => handleAction(showBanModal, true)} 
                  disabled={!banReason.trim() || isActionLoading}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-rose-600/20 disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Ban'}
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
