
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

const AdminCommsPage: React.FC = () => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState({ name: 'Admin', id: 'nexus-admin-master' });
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<{label: string, value: string, icon: React.ReactNode}[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Identity Check
    const rawLocal = localStorage.getItem('nexus_demo_session');
    if (rawLocal) {
      try {
        const session = JSON.parse(rawLocal);
        if (session.user) setCurrentAdmin({ name: session.user.name || 'Admin', id: session.user.id });
      } catch (e) {}
    }

    const fetchInitial = async () => {
      // Fetch Admin Messages
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('admin_messages').select('*').order('created_at', { ascending: true }).limit(100);
          if (data) setMessages(data as AdminMessage[]);
        } catch (e) { console.error(e); }
      } else {
        setMessages([
          { id: '1', admin_name: 'Nexus System', admin_id: 'system', content: 'Administrative Communication Protocol Initiated.', created_at: new Date(Date.now() - 3600000).toISOString(), isSystem: true },
          { id: '2', admin_name: 'Burak', admin_id: 'burak', content: 'Sistem stabil mi beyler?', created_at: new Date(Date.now() - 1800000).toISOString() }
        ]);
      }

      // Fetch Users for Autocomplete
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

    // Realtime Listener
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase.channel('admin_chat')
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
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Input Changes for Suggestions
  useEffect(() => {
    if (input.startsWith('/')) {
      const parts = input.slice(1).split(' ');
      const cmdPart = parts[0].toLowerCase();
      
      if (parts.length === 1) {
        // Command suggestions
        const filtered = COMMANDS
          .filter(c => c.cmd.startsWith(cmdPart))
          .map(c => ({ label: c.cmd, value: c.cmd, icon: c.icon }));
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSuggestionIndex(0);
      } else if (parts.length === 2 && (cmdPart === 'ban' || cmdPart === 'delete')) {
        // User suggestions
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
      return;
    }

    if (!target) {
      addSystemMessage(`Command requires target: /${command} [username]`, 'error');
      return;
    }

    const user = allUsers.find(u => u.username.toLowerCase() === target.toLowerCase());
    
    if (!user) {
      addSystemMessage(`Identity not found: @${target}`, 'error');
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { title: 'TERMINAL ERROR', message: `User @${target} not found in database.`, type: 'error' } 
      }));
      return;
    }

    if (command === 'ban') {
      addSystemMessage(`Executing ban protocol on @${target}...`);
      // Trigger actual ban (mocking the internal dispatch)
      const mockEvent = new CustomEvent('nexus-execute-ban', { detail: { userId: user.id, username: user.username, reason } });
      window.dispatchEvent(mockEvent); 
      addSystemMessage(`User @${target} has been restricted. Protocol Complete.`, 'success');
    } else if (command === 'delete') {
      addSystemMessage(`Executing purge protocol on @${target}...`);
      addSystemMessage(`Records for @${target} cleared from mainframe.`, 'success');
    } else {
      addSystemMessage(`Unknown directive: ${command}`, 'error');
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
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      admin_name: currentAdmin.name,
      admin_id: currentAdmin.id,
      content: input,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('admin_messages').insert({
          admin_name: currentAdmin.name,
          admin_id: currentAdmin.id,
          content: input
        });
        if (error) throw error;
      } catch (e) { 
        console.error(e);
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
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-6xl mx-auto overflow-hidden animate-in fade-in zoom-in-95">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-t-[3rem] p-8 flex justify-between items-center backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-500/5">
            <Shield className="text-amber-500" size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Admin Comms</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Encrypted Channel Layer-4</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-slate-950/50 px-6 py-3 rounded-2xl border border-slate-800">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auth: {currentAdmin.name}</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-slate-950/40 border-x border-slate-800 overflow-y-auto p-8 md:p-12 custom-scrollbar" ref={scrollRef}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-xs font-black uppercase tracking-widest">Decoding Stream...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <Terminal size={64} className="mb-6" />
            <p className="text-3xl font-black uppercase tracking-[0.4em]">Zero Traffic</p>
          </div>
        ) : (
          <div className="space-y-10">
            {messages.map((msg, idx) => {
              const isMe = msg.admin_name === currentAdmin.name;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center animate-in fade-in duration-300">
                    <div className={`px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 ${
                      msg.status === 'error' 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}>
                      {msg.status === 'error' ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {msg.admin_name}
                    </span>
                    <span className="text-[8px] text-slate-700 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={`max-w-[80%] p-6 rounded-[2rem] border shadow-2xl ${
                    isMe 
                      ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100 rounded-tr-none' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none'
                  }`}>
                    <p className="text-base font-medium leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-b-[3rem] p-8 backdrop-blur-3xl shadow-2xl relative">
        
        {/* Suggestion Menu */}
        {showSuggestions && (
          <div className="absolute bottom-[calc(100%-10px)] left-8 right-8 bg-slate-900/90 border border-slate-800 rounded-[2rem] shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 z-[50]">
            <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Suggestions</span>
              <div className="flex gap-4 text-[9px] font-black text-slate-600 uppercase">
                <span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">TAB</kbd> Select</span>
                <span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">↑↓</kbd> Nav</span>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
              {suggestions.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => applySuggestion(s)}
                  onMouseEnter={() => setSuggestionIndex(i)}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-left transition-all ${
                    i === suggestionIndex ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className={`${i === suggestionIndex ? 'text-white' : 'text-indigo-500'}`}>{s.icon}</div>
                  <span className="font-bold uppercase text-xs tracking-widest">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-center gap-4">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-slate-950 rounded-lg">
            <Zap className="text-indigo-500" size={16} />
          </div>
          <input 
            ref={inputRef}
            type="text"
            value={input}
            onKeyDown={handleKeyDown}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Transmit command (type / for protocols)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl py-6 pl-16 pr-24 text-white focus:border-indigo-500 outline-none font-medium transition-all shadow-inner"
          />
          <button 
            type="submit"
            disabled={!input.trim() || sending}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-30"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
        <p className="text-center mt-6 text-[8px] font-black text-slate-700 uppercase tracking-[0.5em]">
          End-to-End Cryptography Active • Protocol Restricted
        </p>
      </div>
    </div>
  );
};

export default AdminCommsPage;
