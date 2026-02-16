import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Eye, Clock, AlertCircle, Info } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { Message } from '../types.ts';

// Bağlantı hatası durumunda gösterilecek acil durum verileri
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
    setError(null);
    
    if (isSupabaseConfigured) {
      try {
        // Hata Düzeltmesi: 'user:profiles' yerine 'user:user_id(*)' kullanımı 
        // Supabase'in Foreign Key ilişkisini (user_id -> profiles) tanımasını sağlar.
        const { data, error: mError } = await supabase
          .from('messages')
          .select('*, user:user_id(*)') 
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (mError) throw mError;
        
        if (data) {
          setMessages(data as Message[]);
        }
      } catch (err: any) {
        console.error("Messages fetch error:", err);
        setError("Neural link unstable. Accessing localized buffer.");
        setMessages(MOCK_MESSAGES);
      } finally {
        setLoading(false);
      }
    } else {
      // Supabase bağlı değilse simülasyon
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
      } catch (err) { 
        console.error("Delete error:", err);
      }
    } else {
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMessage(null);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-160px)] flex flex-col overflow-hidden p-2">
      {/* Header Section */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase text-white">Signal Stream</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Monitoring global transmissions</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 text-amber-500 text-xs font-black uppercase tracking-wider animate-pulse">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
        {/* Stream List (Left) */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-300 flex items-center gap-3">
              <MessageSquare size={16} className="text-indigo-500" /> Incoming Packets
            </h3>
            <span className="text-[10px] font-mono text-slate-600 uppercase font-black">{messages.length} Units</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-800/20 rounded-3xl border border-white/5"></div>)}
              </div>
            ) : messages.map((msg) => (
              <div 
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                  selectedMessage?.id === msg.id 
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
                    : 'bg-slate-950/40 border-slate-800/40 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user_id}`} 
                      className="w-10 h-10 rounded-xl bg-slate-900 p-1 border border-slate-800 shadow-lg" 
                      alt="avatar"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-100 uppercase tracking-tight">{msg.user?.username || 'ANON_SIGNAL'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{new Date(msg.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2 italic leading-relaxed">"{msg.content}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel (Right) */}
        <div className="flex flex-col overflow-hidden">
          {selectedMessage ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[4rem] flex flex-col h-full shadow-2xl animate-in slide-in-from-right-10 duration-500 overflow-hidden">
                <div className="p-10 border-b border-slate-800/50 bg-slate-950/30 flex items-center gap-8">
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedMessage.user_id}`} 
                      className="w-20 h-20 rounded-[2.5rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-2xl animate-pulse" 
                    />
                    <div>
                        <h3 className="text-3xl font-black text-white uppercase mb-1">{selectedMessage.user?.username || 'ANON_SIGNAL'}</h3>
                        <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.4em]">Node: {String(selectedMessage.user_id).slice(0, 8)}</p>
                    </div>
                </div>
                
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 text-slate-600 mb-8 uppercase text-[9px] font-black tracking-[0.3em]">
                        <Clock size={14} className="text-indigo-500" /> Timestamp: {new Date(selectedMessage.created_at).toLocaleString()}
                    </div>
                    <div className="bg-slate-950/60 p-10 rounded-[3rem] border border-white/5 shadow-inner">
                        <p className="text-xl text-slate-200 leading-relaxed font-medium italic">"{selectedMessage.content}"</p>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-800/50 bg-slate-950/30 flex gap-6">
                    <button 
                      onClick={() => handleDelete(selectedMessage.id)} 
                      className="flex-1 py-6 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl font-black uppercase text-xs transition-all duration-300 border border-rose-500/20 shadow-lg group"
                    >
                      <Trash2 size={18} className="inline mr-2 group-hover:rotate-12 transition-transform" /> Purge Signal
                    </button>
                    <button className="flex-1 py-6 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black uppercase text-xs text-white border border-slate-700 transition-all shadow-lg">
                      <Eye size={18} className="inline mr-2" /> Trace Origin
                    </button>
                </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-slate-800/50 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center group">
              <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-8 border border-slate-800 group-hover:scale-110 transition-transform">
                <Info size={40} className="text-slate-700" />
              </div>
              <h3 className="text-2xl font-black uppercase text-slate-700">Awaiting Signal</h3>
              <p className="text-sm font-bold uppercase tracking-widest mt-2 text-slate-800">Select packet for deep analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;