import { User, Shield, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface AccountPanelProps {
  profile: UserProfile;
  onLogout: () => void;
}

export default function AccountPanel({
  profile,
  onLogout
}: AccountPanelProps) {

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="account-profiling-interop-panel">
      
      {/* Account Info Block */}
      <div className="bg-glass rounded-xl p-5 border border-gray-800">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-4">
          <User className="w-5 h-5 text-brand-cyan" />
          <h2 className="text-sm font-display font-bold text-white uppercase tracking-tight">Active Identity Profile</h2>
        </div>

        <div className="space-y-4">
           {profile.avatarUrl && (
             <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border border-gray-700" />
           )}
           <div>
             <span className="block text-[10px] font-mono text-gray-400 uppercase">Full Name</span>
             <span className="text-white text-sm">{profile.name}</span>
           </div>
           <div>
             <span className="block text-[10px] font-mono text-gray-400 uppercase">Email Address</span>
             <span className="text-white text-sm">{profile.email}</span>
           </div>
           <div>
             <span className="block text-[10px] font-mono text-gray-400 uppercase">Country</span>
             <span className="text-white text-sm">{profile.country || 'Not Set'}</span>
           </div>
        </div>

        <div className="mt-5 p-3.5 bg-gray-950/30 rounded border border-gray-850/50 text-[10.5px] leading-relaxed text-gray-400">
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-gray-300 font-semibold uppercase">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            Core Account Credentials Info
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>Account ID: <span className="text-white">{profile.derivAccountId}</span></div>
            <div>Primary Currency: <span className="text-white">{profile.currency}</span></div>
            <div>Account Type: <span className="text-white uppercase font-bold text-brand-cyan">{profile.accountType}</span></div>
            <div>Auth Status: <span className="text-emerald-400 uppercase font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Active</span></div>
          </div>
        </div>
      </div>

      <div className="bg-glass rounded-xl p-5 border border-gray-800 flex flex-col justify-between">
        <div>
           <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
            <h2 className="text-sm font-display font-bold text-white uppercase tracking-tight">Authentication Management</h2>
          </div>
          <p className="text-gray-400 text-xs mb-4">
            You are securely linked to your Deriv Trading Profile. If you wish to switch accounts or revoke access, you can securely log out.
          </p>
        </div>

        <button 
           onClick={onLogout}
           className="w-full py-3 bg-red-900/40 text-red-400 hover:bg-red-900 hover:text-white border border-red-900/50 rounded-lg transition-colors font-bold tracking-wider"
        >
          Logout & Disconnect Session
        </button>
      </div>
    </div>
  );
}
