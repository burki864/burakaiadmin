
import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Eye, Clock, AlertCircle, Info, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { Message } from '../types.ts';

const MOCK_MESSAGES: Message[] = [
  { id: '1', user_id: 'u1', content: 'Neural link established. Scanning frequencies.', created_at: new Date().toISOString(), user: { username: 'sys_admin', full_name: 'System Administrator', email: 'admin@nexus.io' } as any },
  { id: '2', user_id: 'u2', content: 'Packet loss at 0.001%. System stable.', created_at: new Date(Date.now() - 3600000).toISOString(), user: { username: 'kaito_bot', full_name: 'Kaito Shion', email: 'bot@nexus.io' } as any },
];

const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    
    if (isSupabaseConfigured) {
      try {
        const { data, error: mError } = await supabase
          .from('messages')
          .select('*, user:user_id(id, username, full_name, email)') 
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (mError) throw mError;
        if (data) setMessages(data as unknown as Message[]);
      } catch (err: any) {
        console.error("Messages fetch error:", err);
        setError("Network instability detected. Using local buffer.");
        setMessages(MOCK_MESSAGES);
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        setMessages(MOCK_MESSAGES);
        setLoading(false);
      }, 500);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error: dError } = await supabase.from('messages').delete().eq('id', id);
        if (dError) throw dError;
        fetchMessages();
        setSelectedMessage(null);
      } catch (err) { console.error(err); }
    } else {
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMessage(null);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-160px)] flex flex-col overflow-hidden p-2">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase text-white">Signal Stream</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Deep Analysis of Real-time Comms</p>
        </div>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 text-amber-500 text-xs font-black uppercase tracking-wider animate-pulse">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-300 flex items-center gap-3">
              <MessageSquare size={16} className="text-indigo-500" /> Live Feed
            </h3>
            <span className="text-[10px] font-mono text-slate-600 uppercase font-black">{messages.length} Active Packets</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-800/20 rounded-3xl"></div>)}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-40 text-center opacity-10 font-black uppercase tracking-widest">No Signals Intercepted</div>
            ) : messages.map((msg) => (
              <div 
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                  selectedMessage?.id === msg.id 
                    ? 'bg-indigo-600/20 border-indigo-500/50' 
                    : 'bg-slate-950/40 border-slate-800/40 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(msg.user_id)}`} 
                      className="w-10 h-10 rounded-xl bg-slate-900 p-1 border border-slate-800" 
                      alt="avatar"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-100 uppercase tracking-tight leading-none">{msg.user?.full_name || 'UNDEFINED'}</p>
                      <p className="text-[9px] text-indigo-500 font-black uppercase mt-1">@{msg.user?.username || 'ANONYMOUS'}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2 italic font-medium">"{msg.content}"</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          {selectedMessage ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] flex flex-col h-full shadow-2xl animate-in slide-in-from-right-10 duration-500 overflow-hidden">
                <div className="p-10 border-b border-slate-800/50 bg-slate-950/30 flex items-center gap-8">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(selectedMessage.user_id)}`} 
                      className="w-24 h-24 rounded-[2.5rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-2xl" 
                    />
                    <div>
                        <h3 className="text-3xl font-black text-white uppercase leading-none mb-2">{selectedMessage.user?.full_name || 'UNKNOWN SENDER'}</h3>
                        <div className="flex gap-4">
                           <p className="text-indigo-500 text-[10px] font-black uppercase tracking-widest">@{selectedMessage.user?.username || 'anon'}</p>
                           <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">SIG: {String(selectedMessage.id).slice(0, 8)}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 text-slate-600 mb-8 uppercase text-[10px] font-black tracking-widest">
                        <Clock size={14} className="text-indigo-500" /> Intercepted: {new Date(selectedMessage.created_at).toLocaleString()}
                    </div>
                    <div className="bg-slate-950/60 p-10 rounded-[3rem] border border-white/5">
                        <p className="text-2xl text-slate-200 leading-relaxed font-black tracking-tight italic">"{selectedMessage.content}"</p>
                    </div>

                    <div className="mt-10 p-8 border border-slate-800 rounded-3xl bg-slate-900/50">
                        <h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-widest flex items-center gap-2"><User size={12}/> Origin Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] text-slate-500 uppercase font-black">Email Link</p>
                                <p className="text-xs text-slate-300 font-bold">{selectedMessage.user?.email || 'unverified'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 uppercase font-black">User ID</p>
                                <p className="text-xs text-slate-300 font-mono">{String(selectedMessage.user_id).slice(0, 12)}...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-800/50 bg-slate-950/30 flex gap-6">
                    <button 
                      onClick={() => handleDelete(selectedMessage.id)} 
                      className="flex-1 py-6 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl font-black uppercase text-xs transition-all border border-rose-500/20 shadow-xl"
                    >
                      <Trash2 size={18} className="inline mr-2" /> Purge Packet
                    </button>
                    <button className="flex-1 py-6 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase text-xs text-white border border-slate-700 transition-all shadow-xl">
                      <Eye size={18} className="inline mr-2" /> Neural Trace
                    </button>
                </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-slate-800/50 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center">
              <Info size={60} className="text-slate-800 mb-6" />
              <h3 className="text-2xl font-black uppercase text-slate-700">Comms Observer</h3>
              <p className="text-sm font-bold uppercase tracking-widest mt-2 text-slate-800">Select transmission to decrypt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
