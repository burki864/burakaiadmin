
import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, Terminal, Loader2, User, Zap, ChevronRight, Ban, Trash2, Eraser, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfile } from '../types.ts';

interface AdminMessage {
  id: string;
  admin_name: string;
  admin_id: string;
  content: string;
  created_at: string;
  isSystem?: boolean;
  status?: 'success' | 'error';
}

const COMMANDS = [
  { cmd: 'ban', desc: 'Revoke user access', icon: <Ban size={14}/> },
  { cmd: 'delete', desc: 'Purge user records', icon: <Trash2 size={14}/> },
  { cmd: 'clear', desc: 'Clear console buffer', icon: <Eraser size={14}/> },
];

const ADMIN_STORAGE_KEY = 'nexus_admin_comms_v1';

const AdminCommsPage: React.FC = () => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState({ name: 'Admin', id: 'nexus-admin-master' });
  
  const [suggestions, setSuggestions] = useState<{label: string, value: string, icon: React.ReactNode}[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persistence Sync
  useEffect(() => {
    const rawLocal = localStorage.getItem('nexus_demo_session');
    if (rawLocal) {
      try {
        const session = JSON.parse(rawLocal);
        if (session.user) setCurrentAdmin({ name: session.user.name || 'Admin', id: session.user.id });
      } catch (e) {}
    }

    const fetchInitial = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('admin_messages').select('*').order('created_at', { ascending: true }).limit(100);
          if (data) setMessages(data as AdminMessage[]);
        } catch (e) { console.error(e); }
      } else {
        const storedMessages = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (storedMessages) {
          setMessages(JSON.parse(storedMessages));
        } else {
          const initial = [
            { id: '1', admin_name: 'Nexus System', admin_id: 'system', content: 'Administrative Communication Protocol Initiated.', created_at: new Date(Date.now() - 3600000).toISOString(), isSystem: true }
          ];
          setMessages(initial);
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(initial));
        }
      }

      if (isSupabaseConfigured) {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setAllUsers(data as UserProfile[]);
      } else {
        const stored = localStorage.getItem('nexus_demo_users');
        if (stored) setAllUsers(JSON.parse(stored));
      }
      
      setLoading(false);
    };

    fetchInitial();

    if (isSupabaseConfigured) {
      const channel = supabase.channel('admin_chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages' }, (payload) => {
          const newMsg = payload.new as AdminMessage;
          setMessages(prev => [...prev, newMsg]);
          
          const currentIdentity = JSON.parse(localStorage.getItem('nexus_demo_session') || '{}')?.user?.name;
          if (newMsg.admin_name !== currentIdentity) {
            window.dispatchEvent(new CustomEvent('nexus-toast', { 
              detail: { title: 'ADMIN COMMS', message: `${newMsg.admin_name}: ${newMsg.content.slice(0, 30)}...`, type: 'info' } 
            }));
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  // Save to localStorage whenever messages change in demo mode
  useEffect(() => {
    if (!isSupabaseConfigured && !loading) {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(messages));
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (input.startsWith('/')) {
      const parts = input.slice(1).split(' ');
      const cmdPart = parts[0].toLowerCase();
      
      if (parts.length === 1) {
        const filtered = COMMANDS
          .filter(c => c.cmd.startsWith(cmdPart))
          .map(c => ({ label: c.cmd, value: c.cmd, icon: c.icon }));
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSuggestionIndex(0);
      } else if (parts.length === 2 && (cmdPart === 'ban' || cmdPart === 'delete')) {
        const userPart = parts[1].toLowerCase();
        const filtered = allUsers
          .filter(u => u.username.toLowerCase().includes(userPart))
          .map(u => ({ label: u.username, value: u.username, icon: <User size={14}/> }));
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [input, allUsers]);

  const addSystemMessage = (content: string, status: 'success' | 'error' = 'success') => {
    const sysMsg: AdminMessage = {
      id: Math.random().toString(36).substr(2, 9),
      admin_name: 'Terminal',
      admin_id: 'system',
      content,
      created_at: new Date().toISOString(),
      isSystem: true,
      status
    };
    setMessages(prev => [...prev, sysMsg]);
  };

  const executeCommand = async (fullCmd: string) => {
    const parts = fullCmd.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const target = parts[1];
    const reason = parts.slice(2).join(' ') || 'Violation of protocol';

    if (command === 'clear') {
      setMessages([]);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      return;
    }

    if (!target) {
      addSystemMessage(`Directive error: /${command} [username]`, 'error');
      return;
    }

    const user = allUsers.find(u => u.username.toLowerCase() === target.toLowerCase());
    
    if (!user) {
      addSystemMessage(`Node not found: @${target}`, 'error');
      return;
    }

    if (command === 'ban') {
      addSystemMessage(`Executing ban sequence on @${target}...`);
      window.dispatchEvent(new CustomEvent('nexus-execute-ban', { detail: { userId: user.id, username: user.username, reason } })); 
      addSystemMessage(`@${target} restricted. Sequence complete.`, 'success');
    } else if (command === 'delete') {
      addSystemMessage(`Initiating data purge on @${target}...`);
      addSystemMessage(`@${target} purged from database.`, 'success');
    } else {
      addSystemMessage(`Invalid directive: ${command}`, 'error');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;

    if (input.startsWith('/')) {
      await executeCommand(input);
      setInput('');
      return;
    }

    setSending(true);
    const newMessage: AdminMessage = {
      id: Math.random().toString(36).substr(2, 9),
      admin_name: currentAdmin.name,
      admin_id: currentAdmin.id,
      content: input,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('admin_messages').insert({ admin_name: currentAdmin.name, admin_id: currentAdmin.id, content: input });
        if (error) throw error;
      } catch (e) { 
        setMessages(prev => [...prev, newMessage]);
      }
    } else {
      setMessages(prev => [...prev, newMessage]);
    }

    setInput('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const applySuggestion = (suggestion: {value: string}) => {
    const parts = input.split(' ');
    if (parts.length === 1) {
      setInput(`/${suggestion.value} `);
    } else {
      parts[1] = suggestion.value;
      setInput(parts.slice(0, 2).join(' ') + ' ');
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] max-w-6xl mx-auto overflow-hidden animate-in fade-in zoom-in-95">
      {/* Header - Compact for mobile */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-t-[1.5rem] md:rounded-t-[3rem] p-4 md:p-8 flex justify-between items-center backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="p-2 md:p-4 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/20">
            <Shield className="text-amber-500 w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase text-white tracking-tighter">Admin Comms</h2>
            <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Encrypted L4 Channel</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 bg-slate-950/50 px-3 md:px-6 py-1.5 md:py-3 rounded-xl border border-slate-800">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentAdmin.name}</span>
        </div>
      </div>

      {/* Chat Area - Optimized for mobile content */}
      <div className="flex-1 bg-slate-950/40 border-x border-slate-800 overflow-y-auto p-4 md:p-12 custom-scrollbar" ref={scrollRef}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <Loader2 className="animate-spin mb-4" size={24} />
            <p className="text-[10px] font-black uppercase tracking-widest">Decoding...</p>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-10">
            {messages.map((msg) => {
              const isMe = msg.admin_name === currentAdmin.name;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className={`px-4 py-2 rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      msg.status === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}>
                      {msg.status === 'error' ? <AlertCircle size={12}/> : <CheckCircle size={12}/>}
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {msg.admin_name}
                    </span>
                    <span className="text-[7px] text-slate-700 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className={`max-w-[90%] md:max-w-[80%] p-3 md:p-6 rounded-[1.2rem] md:rounded-[2rem] border shadow-xl ${
                    isMe ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100 rounded-tr-none' : 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none'
                  }`}>
                    <p className="text-sm md:text-base font-medium leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area - Compact for mobile */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-b-[1.5rem] md:rounded-b-[3rem] p-4 md:p-8 backdrop-blur-3xl shadow-2xl relative">
        {showSuggestions && (
          <div className="absolute bottom-[calc(100%-10px)] left-4 right-4 md:left-8 md:right-8 bg-slate-900/95 border border-slate-800 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl backdrop-blur-2xl overflow-hidden z-[50]">
            <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase">Proposals</span>
              <span className="text-[7px] md:text-[9px] font-black text-slate-600 uppercase">Tab to select</span>
            </div>
            <div className="max-h-40 md:max-h-60 overflow-y-auto custom-scrollbar p-1">
              {suggestions.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => applySuggestion(s)}
                  onMouseEnter={() => setSuggestionIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    i === suggestionIndex ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className={`${i === suggestionIndex ? 'text-white' : 'text-indigo-500'}`}>{s.icon}</div>
                  <span className="font-bold uppercase text-[10px] tracking-widest">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-center gap-3">
          <div className="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-slate-950 rounded-lg">
            <Zap className="text-indigo-500" size={16} />
          </div>
          <input 
            ref={inputRef}
            type="text"
            value={input}
            onKeyDown={handleKeyDown}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cmd (type /)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl md:rounded-3xl py-4 md:py-6 px-4 md:pl-16 md:pr-24 text-white focus:border-indigo-500 outline-none font-medium text-sm transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim() || sending}
            className="p-3 md:p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl md:rounded-2xl transition-all shadow-xl disabled:opacity-30"
          >
            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
        <p className="hidden md:block text-center mt-4 text-[8px] font-black text-slate-700 uppercase tracking-[0.5em]">
          Persistent Comms Buffers Active
        </p>
      </div>
    </div>
  );
};

export default AdminCommsPage;
