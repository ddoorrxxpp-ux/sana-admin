import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Store, GitBranch, CreditCard, 
  Users, BarChart3, Settings, ScrollText, 
  LogOut, Menu, X, Bell, Search, User,
  ChevronRight, Sparkles, Truck
} from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useCamera } from './CameraProvider';
import { logActivity } from '../utils/logger';

interface LayoutProps {
  user: UserProfile;
}

/**
 * المكون الرئيسي للتنسيق - باللهجة العراقية
 * يحتوي على السايد بار (Sidebar) والتوب بار (Topbar)
 */
export default function Layout({ user }: LayoutProps) {
  const { captureSnapshot } = useCamera();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (auth.currentUser) {
        const snapshot = await captureSnapshot();
        await logActivity(
          auth.currentUser.uid,
          auth.currentUser.email || 'غير معروف',
          'تسجيل خروج',
          'تم تسجيل الخروج من النظام',
          'logout',
          snapshot
        );
      }
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard, color: 'text-blue-400' },
    { path: '/restaurants', label: 'المطاعم', icon: Store, color: 'text-emerald-400' },
    { path: '/chain-owners', label: 'مسؤولي السلاسل', icon: GitBranch, color: 'text-purple-400' },
    { path: '/subscriptions', label: 'الاشتراكات', icon: CreditCard, color: 'text-amber-400' },
    { path: '/users', label: 'المستخدمين', icon: Users, color: 'text-indigo-400' },
    { path: '/drivers', label: 'المناديب', icon: Truck, color: 'text-orange-400' },
    { path: '/reports', label: 'التقارير', icon: BarChart3, color: 'text-rose-400' },
    { path: '/settings', label: 'الإعدادات', icon: Settings, color: 'text-slate-400' },
    ...(user.role === 'super_admin' ? [{ path: '/logs', label: 'سجل النشاطات', icon: ScrollText, color: 'text-cyan-400' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* خلفية جمالية */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* السايد بار (Sidebar) */}
      <aside 
        className={`fixed top-0 right-0 z-50 h-screen transition-all duration-500 ease-out border-l border-white/5 bg-black/40 backdrop-blur-2xl ${
          isSidebarOpen ? 'w-72' : 'w-24'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* اللوغو */}
          <div className="flex items-center gap-4 mb-12 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-black tracking-tighter text-white"
              >
                رستو <span className="text-blue-500">SaaS</span>
              </motion.span>
            )}
          </div>

          {/* القائمة */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all group relative overflow-hidden ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-6 h-6 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : item.color}`} />
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="font-bold text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-white"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* زر تسجيل الخروج */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all group mt-auto"
          >
            <LogOut className="w-6 h-6 shrink-0 group-hover:translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-bold text-sm">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main 
        className={`transition-all duration-500 ease-out min-h-screen relative z-10 ${
          isSidebarOpen ? 'pr-72' : 'pr-24'
        }`}
      >
        {/* التوب بار (Topbar) */}
        <header className="h-24 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl w-80 focus-within:border-blue-500/50 transition-all">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="ابحث عن أي شي..." 
                className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white group">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#050505] group-hover:scale-125 transition-transform"></span>
            </button>
            
            <div className="h-10 w-px bg-white/5 mx-2"></div>

            <div className="flex items-center gap-4 pl-2">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-black text-white leading-none">{user.name}</p>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                  {user.role === 'super_admin' ? 'مدير النظام' : 'مسؤول'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center shadow-lg group cursor-pointer hover:border-blue-500/50 transition-all">
                <User className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>
        </header>

        {/* محتوى الصفحة */}
        <div className="p-8 max-w-[1600px] mx-auto">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
