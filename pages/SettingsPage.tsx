
import React from 'react';
import { Shield, Bell, Database, Globe, Lock, Cpu } from 'lucide-react';

const SettingsSection: React.FC<{ title: string, subtitle: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, subtitle, icon, children }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden">
    <div className="p-8 border-b border-slate-800 bg-slate-800/10 flex items-center gap-4">
      <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
    <div className="p-8">
      {children}
    </div>
  </div>
);

const Toggle: React.FC<{ label: string, description: string, checked?: boolean }> = ({ label, description, checked = false }) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex-1 pr-4">
      <p className="font-semibold text-sm mb-0.5">{label}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
    <button className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'left-7' : 'left-1'}`}></div>
    </button>
  </div>
);

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">System Preferences</h2>
        <p className="text-slate-400">Configure global admin parameters and security protocols.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SettingsSection 
          title="General Access" 
          subtitle="Control public registrations and entry points." 
          icon={<Globe size={24} />}
        >
          <div className="space-y-2 divide-y divide-slate-800/50">
            <Toggle label="Open Registrations" description="Allow new users to create accounts without invitations." />
            <Toggle label="Email Verification" description="Require users to confirm their email before posting." checked={true} />
            <Toggle label="Maintenance Mode" description="Disable public site access for system updates." />
          </div>
        </SettingsSection>

        <SettingsSection 
          title="Security & Auth" 
          subtitle="Encryption and session management protocols." 
          icon={<Lock size={24} />}
        >
          <div className="space-y-2 divide-y divide-slate-800/50">
            <Toggle label="2FA Enforcement" description="Mandatory two-factor authentication for all moderators." checked={true} />
            <Toggle label="Session Persistence" description="Allow admin sessions to remain active for 30 days." checked={true} />
            <Toggle label="IP Whitelisting" description="Only allow logins from recognized administrative IPs." />
          </div>
        </SettingsSection>

        <SettingsSection 
          title="Live Feed Sync" 
          subtitle="Real-time data streaming and caching." 
          icon={<Cpu size={24} />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Buffer Threshold</label>
              <input type="range" className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-2">
                <span>50 MSG</span>
                <span>500 MSG</span>
              </div>
            </div>
            <Toggle label="Real-time Stream" description="Enable Supabase realtime sockets for message feed." checked={true} />
          </div>
        </SettingsSection>

        <SettingsSection 
          title="Notifications" 
          subtitle="Alerting systems for high-priority events." 
          icon={<Bell size={24} />}
        >
          <div className="space-y-2 divide-y divide-slate-800/50">
            <Toggle label="Spam Alerts" description="Notify admins when system detects high frequency posting." checked={true} />
            <Toggle label="Error Logging" description="Push notifications for server-side exceptions." />
            <Toggle label="Audit Digest" description="Send weekly administrative summary via email." checked={true} />
          </div>
        </SettingsSection>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button className="px-8 py-3 bg-slate-800 hover:bg-slate-700 transition-colors rounded-2xl font-bold text-sm">Reset to Default</button>
        <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-2xl font-bold text-sm text-white shadow-xl shadow-indigo-600/20">Apply Global Changes</button>
      </div>
    </div>
  );
};

export default SettingsPage;
