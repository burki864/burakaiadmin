
import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, ShieldAlert, Activity, TrendingUp, TrendingDown, Database } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

const chartData = [
  { name: 'Mon', active: 400, messages: 240 },
  { name: 'Tue', active: 300, messages: 139 },
  { name: 'Wed', active: 200, messages: 980 },
  { name: 'Thu', active: 278, messages: 390 },
  { name: 'Fri', active: 189, messages: 480 },
  { name: 'Sat', active: 239, messages: 380 },
  { name: 'Sun', active: 349, messages: 430 },
];

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, trend?: number }> = ({ title, value, icon, trend }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl hover:border-slate-700 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-800 rounded-2xl group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-colors">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold tracking-tight">{value}</p>
  </div>
);

const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, messages: 0, banned: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (isSupabaseConfigured) {
        try {
          const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          const { count: messages } = await supabase.from('messages').select('*', { count: 'exact', head: true });
          const { count: banned } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('banned', true);
          setStats({ users: users || 0, messages: messages || 0, banned: banned || 0 });
        } catch (e) { console.error(e); }
      } else {
        // Mock data for demo
        setStats({ users: 12480, messages: 84200, banned: 142 });
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Nexus Analytics</h2>
          <p className="text-slate-400">Real-time system health and user activity.</p>
        </div>
        {!isSupabaseConfigured && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-600/20 rounded-xl text-indigo-400 text-xs font-bold">
            <Database size={14} />
            SECURITY BYPASS ACTIVE
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.users.toLocaleString()} icon={<Users size={24} />} trend={12} />
        <StatCard title="Total Messages" value={stats.messages.toLocaleString()} icon={<MessageSquare size={24} />} trend={4} />
        <StatCard title="Banned Users" value={stats.banned.toLocaleString()} icon={<ShieldAlert size={24} />} trend={-2} />
        <StatCard title="System Load" value="12%" icon={<Activity size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">Traffic Distribution</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="active" stroke="#6366f1" fillOpacity={1} fill="url(#colorActive)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] flex flex-col">
          <h3 className="text-lg font-bold mb-6">Recent Alerts</h3>
          <div className="space-y-4 flex-1">
            {[
              { type: 'warning', text: 'High volume of messages from IP 192.x', time: '2 mins ago' },
              { type: 'danger', text: 'Potential brute force detected', time: '15 mins ago' },
              { type: 'info', text: 'Daily database backup successful', time: '2 hours ago' },
              { type: 'warning', text: 'Rate limit hit for API endpoint', time: '5 hours ago' },
            ].map((alert, i) => (
              <div key={i} className="flex gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.type === 'danger' ? 'bg-rose-500' : 
                  alert.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                }`} />
                <div>
                  <p className="text-sm font-medium mb-1">{alert.text}</p>
                  <p className="text-xs text-slate-500">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
