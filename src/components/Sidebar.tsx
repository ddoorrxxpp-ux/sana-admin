import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Utensils, 
  GitBranch, 
  CreditCard, 
  Users, 
  Settings, 
  History,
  LogOut,
  ChevronLeft,
  BarChart3
} from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  user: UserProfile;
}

export default function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: 'لوحة التحكم', icon: LayoutDashboard, path: '/' },
    { name: 'إدارة المطاعم', icon: Utensils, path: '/restaurants' },
    { name: 'إدارة الفروع', icon: GitBranch, path: '/branches' },
    { name: 'الاشتراكات', icon: CreditCard, path: '/subscriptions' },
    { name: 'المستخدمين', icon: Users, path: '/users' },
    { name: 'التقارير والتحليلات', icon: BarChart3, path: '/analytics' },
    { name: 'سجل النشاطات', icon: History, path: '/logs' },
    { name: 'الإعدادات', icon: Settings, path: '/settings' },
  ];

  return (
    <aside 
      className={cn(
        "relative bg-slate-900/50 backdrop-blur-xl border-l border-white/10 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl font-bold">YP</span>
            </div>
            <span className="font-bold text-lg tracking-tight">سنة للبرمجة</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5" />
            {!collapsed && <span className="font-medium">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}
