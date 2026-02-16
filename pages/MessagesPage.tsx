
import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Eye, Clock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { Message } from '../types.ts';

const MOCK_MESSAGES: Message[] = [
  { id: '1', user_id: 'u1', content: 'Protocol 77-B initialized. Scanning for signal interference.', created_at: new Date().toISOString(), user: { username: 'sys_admin', email: 'admin@nexus.io' } as any },
  { id: '2', user_id: 'u2', content: 'Database migration successful. Integrity remains at 99.8%.', created_at: new Date(Date.now() - 3600000).toISOString(), user: { username: 'kaito_bot', email: 'bot@nexus.io' } as any },
  { id: '3', user_id: 'u3', content: 'Warning: Unauthorized attempt detected in sector 4. Reviewing logs.', created_at: new Date(Date.now() - 7200000).toISOString(), user: { username: 'shadow_user', email: 'shadow@dark.net' } as any },
];

const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data, error: mError } = await supabase
          .from('messages')
          .select('*, user:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (mError) throw mError;
        if (data) setMessages(data as Message[]);
      } catch (err: any) {
        console.error("Messages fetch error:", err);
        setError("Failed to stream live messages. Switching to localized buffer.");
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

    if (isSupabaseConfigured) {
      const channel = supabase.channel('live-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          try {
            const { data } = await supabase
              .from('messages')
              .select('*, user:profiles(*)')
              .eq('id', payload.new.id)
              .single();
            
            if (data) setMessages(prev => [data as Message, ...prev].slice(0, 50));
          } catch (e) {
            console.error("Realtime update fetch error", e);
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) throw error;

        await supabase.from('admin_logs').insert({
          action: 'DELETE_MESSAGE',
          target_id: id,
          details: `Deleted message ID: ${id}`
        });
        setSelectedMessage(null);
      } catch (err) {
        console.error("Delete error:", err);
      }
    } else {
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMessage(null);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-160px)] flex flex-col">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase text-white">Message Uplink</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Real-time global communication monitoring</p>
        </div>
        <div className="px-5 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center gap-3 animate-pulse">
          <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Signal: Active</span>
        </div>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 text-amber-500 text-xs font-black uppercase tracking-wider mx-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl backdrop-blur-3xl">
          <div className="p-8 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 text-slate-300">
              <MessageSquare size={16} className="text-indigo-500" />
              Incoming Stream
            </h3>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">{messages.length} Packets</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-800/30 rounded-3xl animate-pulse border border-slate-800/20"></div>)}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-40 text-center text-slate-700 font-black uppercase tracking-[0.4em] italic opacity-50">Zero Activity Detected</div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer group ${
                    selectedMessage?.id === msg.id 
                    ? 'bg-indigo-600/10 border-indigo-500/40 shadow-[0_10px_30px_rgba(79,70,229,0.1)]' 
                    : 'bg-slate-950/40 border-slate-800/40 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user_id}`} 
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-1"
                        alt="Avatar"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{msg.user?.username || 'ANON_USER'}</p>
                        <p className="text-[10px] text-slate-500 font-mono font-bold">{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className={`text-slate-700 group-hover:text-indigo-500 transition-all ${selectedMessage?.id === msg.id ? 'translate-x-1 text-indigo-500' : ''}`} />
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    "{msg.content}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
          {selectedMessage ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] flex flex-col h-full animate-in slide-in-from-right-8 duration-500 shadow-2xl backdrop-blur-3xl overflow-hidden">
              <div className="p-10 border-b border-slate-800/50 flex items-center gap-8 bg-slate-950/20">
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedMessage.user_id}`} 
                  className="w-24 h-24 rounded-[2.5rem] border-4 border-slate-800 bg-slate-900 p-3 shadow-2xl"
                  alt="Full Avatar"
                />
                <div>
                  <h3 className="text-3xl font-black tracking-tighter text-white uppercase mb-2">{selectedMessage.user?.username || 'ANONYMOUS'}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">{selectedMessage.user?.email || 'unlinked@uplink.io'}</p>
                  <div className="flex gap-3">
                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">SIG: {selectedMessage.user_id.slice(0, 8)}</span>
                    <span className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">Identified</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 text-slate-600 mb-6 px-2">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Packet Logged • {new Date(selectedMessage.created_at).toLocaleString()}</span>
                </div>
                
                <div className="bg-slate-950/60 p-10 rounded-[3rem] border border-slate-800/50 relative shadow-inner">
                  <div className="absolute top-6 right-8 text-indigo-500/10">
                    <MessageSquare size={80} />
                  </div>
                  <p className="text-xl text-slate-300 leading-relaxed font-medium italic relative z-10">
                    "{selectedMessage.content}"
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-6">
                  <div className="p-8 bg-slate-900/50 rounded-[2rem] border border-slate-800/80 hover:border-indigo-500/20 transition-all">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">AI Sentiment</p>
                    <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[85%]"></div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">85% POS</span>
                    </div>
                  </div>
                  <div className="p-8 bg-slate-900/50 rounded-[2rem] border border-slate-800/80 hover:border-indigo-500/20 transition-all">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">Toxicity Score</p>
                    <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 w-[4%]"></div>
                        </div>
                        <span className="text-xs font-bold text-slate-300">LOW</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 border-t border-slate-800/50 flex gap-6 bg-slate-950/20">
                <button 
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="flex-1 py-6 bg-rose-600/10 hover:bg-rose-600 transition-all group rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-rose-500 hover:text-white flex items-center justify-center gap-3 border border-rose-500/20 shadow-xl"
                >
                  <Trash2 size={18} />
                  Purge Data
                </button>
                <button 
                  className="flex-1 py-6 bg-slate-800 hover:bg-indigo-600 transition-all rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 border border-slate-700"
                >
                  <User size={18} />
                  Trace Origin
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border-2 border-dashed border-slate-800/50 rounded-[4rem] flex-1 flex flex-col items-center justify-center p-20 text-center opacity-30 shadow-inner">
              <div className="w-24 h-24 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-700/50">
                <Eye size={40} className="text-slate-500" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white mb-3 uppercase">Observer Terminal</h3>
              <p className="text-slate-500 max-w-xs text-sm font-bold leading-relaxed uppercase tracking-widest">
                Intercept a transmission from the stream to begin deep packet inspection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
