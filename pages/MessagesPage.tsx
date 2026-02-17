
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
        const { data, error: mError } = await supabase.from('messages').select('*, user:user_id(id, username, full_name, email)').order('created_at', { ascending: false }).limit(50);
        if (mError) throw mError;
        if (data) setMessages(data as unknown as Message[]);
      } catch (err: any) {
        setError("Network instability detected.");
        setMessages(MOCK_MESSAGES);
      } finally { setLoading(false); }
    } else {
      setTimeout(() => { setMessages(MOCK_MESSAGES); setLoading(false); }, 500);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('messages').delete().eq('id', id);
        fetchMessages(); setSelectedMessage(null);
      } catch (err) { console.error(err); }
    } else {
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMessage(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-160px)] flex flex-col overflow-hidden">
      <div className="px-2">
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-1 uppercase text-white leading-none">Signal Stream</h2>
        <p className="text-slate-500 font-bold text-[9px] md:text-xs uppercase tracking-widest">Analysis of Real-time Comms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-10 flex-1 overflow-hidden p-1">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[1.5rem] md:rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 md:p-8 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center shrink-0">
            <h3 className="font-black text-[9px] md:text-xs uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <MessageSquare size={14} className="text-indigo-500" /> Live Feed
            </h3>
            <span className="text-[8px] md:text-[10px] font-mono text-slate-600 uppercase font-black">{messages.length} Nodes</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 custom-scrollbar">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-800/20 rounded-2xl"></div>)}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center opacity-10 font-black uppercase tracking-widest text-sm">No Signals</div>
            ) : messages.map((msg) => (
              <div 
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all duration-300 cursor-pointer ${
                  selectedMessage?.id === msg.id ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-950/40 border-slate-800/40 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(msg.user_id)}`} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 p-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-100 uppercase tracking-tight truncate">{msg.user?.full_name || msg.user?.username || 'Unknown'}</p>
                      <p className="text-[8px] text-indigo-500 font-black uppercase tracking-widest truncate">@{msg.user?.username || 'anon'}</p>
                    </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 italic font-medium leading-relaxed">"{msg.content}"</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex flex-col overflow-hidden">
          {selectedMessage ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] flex flex-col h-full shadow-2xl animate-in slide-in-from-right-6 overflow-hidden">
                <div className="p-10 border-b border-slate-800/50 bg-slate-950/30 flex items-center gap-8">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${String(selectedMessage.user_id)}`} className="w-20 h-20 rounded-[2.5rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-2xl" />
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase leading-none mb-1">{selectedMessage.user?.full_name || selectedMessage.user?.username}</h3>
                        <p className="text-indigo-500 text-[9px] font-black uppercase tracking-widest">@{selectedMessage.user?.username || 'anon'}</p>
                    </div>
                </div>
                
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 text-slate-600 mb-6 uppercase text-[9px] font-black tracking-widest">
                        <Clock size={12} className="text-indigo-500" /> Intercepted: {new Date(selectedMessage.created_at).toLocaleString()}
                    </div>
                    <div className="bg-slate-950/60 p-10 rounded-[2.5rem] border border-white/5">
                        <p className="text-xl text-slate-200 leading-relaxed font-black italic">"{selectedMessage.content}"</p>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-800/50 bg-slate-950/30 flex gap-4">
                    <button onClick={() => handleDelete(selectedMessage.id)} className="flex-1 py-5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl font-black uppercase text-[10px] transition-all border border-rose-500/20">Purge Packet</button>
                    <button className="flex-1 py-5 bg-slate-800 rounded-2xl font-black uppercase text-[10px] text-white">Neural Trace</button>
                </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-slate-800/50 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center">
              <Info size={40} className="text-slate-800 mb-4" />
              <h3 className="text-xl font-black uppercase text-slate-700">Comms Observer</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
