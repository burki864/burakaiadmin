
import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Eye, Clock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import { Message } from '../types.ts';

const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
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
      setError("Failed to stream live messages. Please ensure the database schema is correctly deployed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

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
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        action_type: 'DELETE_MESSAGE',
        details: `Deleted message ID: ${id}`
      });
      setSelectedMessage(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-160px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Live Feed</h2>
          <p className="text-slate-400">Moderating global communications in real-time.</p>
        </div>
        <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
          <span className="text-xs font-bold uppercase tracking-widest">Live</span>
        </div>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3 text-amber-500 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-400" />
              Recent Activity
            </h3>
            <span className="text-xs text-slate-500 font-mono">{messages.length} Active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-slate-800/50 rounded-2xl animate-pulse"></div>)}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center text-slate-500">Silence on the network.</div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    selectedMessage?.id === msg.id 
                    ? 'bg-indigo-600/10 border-indigo-500/30' 
                    : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={`https://picsum.photos/seed/${msg.user_id}/32/32`} 
                        className="w-8 h-8 rounded-lg"
                        alt="Avatar"
                      />
                      <div>
                        <p className="text-sm font-bold group-hover:text-indigo-400 transition-colors">{msg.user?.username || 'Anonymous'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className={`text-slate-600 group-hover:text-indigo-500 transition-all ${selectedMessage?.id === msg.id ? 'translate-x-1 text-indigo-500' : ''}`} />
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col">
          {selectedMessage ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-8 border-b border-slate-800 flex items-center gap-6">
                <img 
                  src={`https://picsum.photos/seed/${selectedMessage.user_id}/80/80`} 
                  className="w-20 h-20 rounded-3xl border-2 border-slate-800 shadow-xl"
                  alt="Full Avatar"
                />
                <div>
                  <h3 className="text-2xl font-bold">{selectedMessage.user?.username || 'Anonymous'}</h3>
                  <p className="text-slate-400 text-sm mb-2">{selectedMessage.user?.email}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID: {selectedMessage.user_id.slice(0, 8)}</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 rounded-md text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Verified Account</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                  <Clock size={14} />
                  <span className="text-xs font-medium uppercase tracking-widest">Broadcast Details • {new Date(selectedMessage.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 relative">
                  <div className="absolute top-4 right-4 text-indigo-500 opacity-20">
                    <MessageSquare size={40} />
                  </div>
                  <p className="text-lg text-slate-200 leading-relaxed whitespace-pre-wrap">
                    "{selectedMessage.content}"
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Sentiment</p>
                    <p className="text-sm font-semibold text-emerald-400">Positive (92%)</p>
                  </div>
                  <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Risk Score</p>
                    <p className="text-sm font-semibold text-slate-300">Low</p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-800 flex gap-4">
                <button 
                  onClick={() => handleDelete(selectedMessage.id)}
                  className="flex-1 py-4 bg-rose-600/10 hover:bg-rose-600 transition-all group rounded-2xl font-bold text-sm text-rose-500 hover:text-white flex items-center justify-center gap-2 border border-rose-500/20 hover:border-rose-500"
                >
                  <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                  Remove Message
                </button>
                <button 
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 transition-all rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <User size={18} />
                  View Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-[2rem] flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <Eye size={32} className="text-slate-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Inspector Portal</h3>
              <p className="text-slate-500 max-w-xs text-sm leading-relaxed">
                Select a message from the live feed to inspect content and user metadata.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
