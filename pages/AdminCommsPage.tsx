
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
  { cmd: 'ban', desc: 'Revoke user access', icon: <Ban size={12}/> },
  { cmd: 'purge', desc: 'Total buffer wipe', icon: <Trash2 size={12}/> },
  { cmd: 'clear', desc: 'Local console reset', icon: <Eraser size={12}/> },
];

const ADMIN_STORAGE_KEY = 'nexus_admin_comms_v2';

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

  useEffect(() => {
    const rawLocal = localStorage.getItem('nexus_demo_session');
    if (rawLocal) {
      try {
        const session = JSON.parse(rawLocal);
        if (session.user) setCurrentAdmin({ name: session.user.name || 'Admin', id: session.user.id });
      } catch (e) {}
    }

    const fetchInitial = async () => {
      setLoading(true);
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('admin_messages').select('*').order('created_at', { ascending: true }).limit(100);
          if (data) setMessages(data as AdminMessage[]);
        } catch (e) { console.error(e); }
      } else {
        const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          const welcome = [{ id: 'sys-0', admin_name: 'System', admin_id: 'system', content: `Admin Interface Active. Logged as ${currentAdmin.name}.`, created_at: new Date().toISOString(), isSystem: true }];
          setMessages(welcome);
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(welcome));
        }
      }

      const usersStored = localStorage.getItem('nexus_demo_users');
      if (usersStored) setAllUsers(JSON.parse(usersStored));
      setLoading(false);
    };

    fetchInitial();
  }, [currentAdmin.name]);

  useEffect(() => {
    if (!loading && !isSupabaseConfigured) {
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
      } else if (parts.length === 2 && (cmdPart === 'ban' || cmdPart === 'purge')) {
        const userPart = parts[1].toLowerCase();
        const filtered = allUsers
          .filter(u => u.username.toLowerCase().includes(userPart))
          .map(u => ({ label: u.username, value: u.username, icon: <User size={12}/> }));
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
    const parts = fullCmd.slice(1).trim().split(' ');
    const command = parts[0].toLowerCase();
    const target = parts[1];

    if (command === 'clear') {
      setMessages([]);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      return;
    }

    if (command === 'purge') {
      setMessages([]);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      addSystemMessage("Total Buffer Purge Sequence Successful.", "success");
      return;
    }

    if (!target) {
      addSystemMessage(`Syntax Err: /${command} [username]`, 'error');
      return;
    }

    const user = allUsers.find(u => u.username.toLowerCase() === target.toLowerCase());
    if (!user) {
      addSystemMessage(`Node Not Found: @${target}`, 'error');
      return;
    }

    if (command === 'ban') {
      window.dispatchEvent(new CustomEvent('nexus-execute-ban', { detail: { userId: user.id, username: user.username, reason: 'CLI Master Protocol' } })); 
      addSystemMessage(`Restriction Command Dispatched to @${user.username}.`, 'success');
    } else {
      addSystemMessage(`Directive Undefined: ${command}`, 'error');
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

    setMessages(prev => [...prev, newMessage]);
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
        if (suggestions[suggestionIndex]) applySuggestion(suggestions[suggestionIndex]);
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
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-180px)] max-w-6xl mx-auto overflow-hidden animate-in fade-in">
      <div className="bg-slate-900/60 border border-slate-800 rounded-t-[1rem] md:rounded-t-[3rem] p-3 md:p-8 flex justify-between items-center backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-2 md:gap-6">
          <div className="p-2 md:p-4 bg-amber-500/10 rounded-lg md:rounded-2xl border border-amber-500/20 shadow-lg">
            <Shield className="text-amber-500 w-4 h-4 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-3xl font-black uppercase text-white tracking-tighter truncate leading-none">Admin Comms</h2>
            <p className="text-[7px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">L4 Encryption Stable</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/50 px-2 md:px-6 py-1 md:py-3 rounded-lg border border-slate-800">
          <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
          <span className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{currentAdmin.name}</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-950/40 border-x border-slate-800 overflow-y-auto p-3 md:p-12 custom-scrollbar" ref={scrollRef}>
        <div className="space-y-4 md:space-y-8">
          {messages.map((msg) => {
            const isMe = msg.admin_name === currentAdmin.name;
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className={`px-4 py-1.5 rounded-full border text-[7px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    msg.status === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-xl shadow-rose-600/5' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-600/5'
                  }`}>
                    {msg.status === 'error' ? <AlertCircle size={10}/> : <CheckCircle size={10}/>}
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-0.5 px-1">
                  <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {msg.admin_name}
                  </span>
                  <span className="text-[6px] md:text-[7px] text-slate-700 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className={`max-w-[95%] md:max-w-[80%] p-2 md:p-5 rounded-[0.8rem] md:rounded-[2rem] border shadow-lg ${
                  isMe ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-50 text-xs md:text-sm rounded-tr-none' : 'bg-slate-900 border-slate-800 text-slate-300 text-xs md:text-sm rounded-tl-none'
                }`}>
                  <p className="leading-snug md:leading-relaxed font-medium">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-b-[1rem] md:rounded-b-[3rem] p-3 md:p-8 backdrop-blur-3xl relative shrink-0">
        {showSuggestions && (
          <div className="absolute bottom-[calc(100%-5px)] left-2 right-2 md:left-8 md:right-8 bg-slate-900 border border-slate-800 rounded-[1rem] md:rounded-[2rem] shadow-2xl z-[50] overflow-hidden backdrop-blur-3xl">
            <div className="p-2 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
              <span className="text-[7px] md:text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Commands & Nodes</span>
            </div>
            <div className="max-h-32 md:max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {suggestions.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => applySuggestion(s)}
                  onMouseEnter={() => setSuggestionIndex(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all ${
                    i === suggestionIndex ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {s.icon}
                  <span className="font-bold uppercase text-[9px] md:text-[10px] tracking-widest">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input 
            ref={inputRef}
            type="text"
            value={input}
            onKeyDown={handleKeyDown}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type directive (/purge)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl md:rounded-3xl py-3 md:py-5 px-4 md:pl-8 text-white focus:border-indigo-500 outline-none font-medium text-[11px] md:text-sm shadow-inner"
          />
          <button type="submit" className="p-3 md:p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl md:rounded-2xl shadow-xl transition-all active:scale-95 shadow-indigo-600/20">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminCommsPage;
