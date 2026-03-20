import { Bell, Search, User } from 'lucide-react';
import { UserProfile } from '../types';

interface TopbarProps {
  user: UserProfile;
}

export default function Topbar({ user }: TopbarProps) {
  return (
    <header className="h-20 border-b border-white/10 bg-slate-900/20 backdrop-blur-md px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="بحث في النظام..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050505]"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-r border-white/10">
          <div className="text-left">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-slate-400">{user.role === 'super_admin' ? 'مدير النظام' : 'مسؤول'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
