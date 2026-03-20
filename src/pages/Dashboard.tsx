import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  TrendingUp, Users, Utensils, Calendar, 
  DollarSign, Activity, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, XCircle, ShoppingBag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { UserProfile } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

/**
 * لوحة التحكم الرئيسية - باللهجة العراقية والفصحى
 * تعرض إحصائيات عامة ورسوم بيانية لنمو المنصة
 */
export default function Dashboard() {
  const { user } = useOutletContext<{ user: UserProfile }>();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    restaurantsCount: 0,
    activeRestaurants: 0,
    suspendedRestaurants: 0,
    dailyOrders: 0,
    monthlyOrders: 0,
    totalUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // بيانات تجريبية للرسوم البيانية (يمكن جلبها من Firestore لاحقاً)
  const earningsData = [
    { name: 'كانون 2', value: 4000 },
    { name: 'شباط', value: 3000 },
    { name: 'آذار', value: 5000 },
    { name: 'نيسان', value: 4500 },
    { name: 'أيار', value: 6000 },
    { name: 'حزيران', value: 5500 },
  ];

  const ordersData = [
    { name: 'السبت', value: 120 },
    { name: 'الأحد', value: 150 },
    { name: 'الاثنين', value: 180 },
    { name: 'الثلاثاء', value: 140 },
    { name: 'الأربعاء', value: 200 },
    { name: 'الخميس', value: 250 },
    { name: 'الجمعة', value: 300 },
  ];

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchData = async () => {
      try {
        console.log("Fetching dashboard data...");
        // جلب إحصائيات المطاعم
        let currentPath = 'restaurants';
        const restSnapshot = await getDocs(collection(db, currentPath));
        console.log("Restaurants fetched:", restSnapshot.size);
        const restaurants = restSnapshot.docs.map(d => d.data());
        
        // جلب إحصائيات الاشتراكات (للأرباح)
        currentPath = 'subscriptions';
        const subSnapshot = await getDocs(collection(db, currentPath));
        console.log("Subscriptions fetched:", subSnapshot.size);
        const totalEarnings = subSnapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);

        // جلب إحصائيات المستخدمين
        currentPath = 'users';
        const usersSnapshot = await getDocs(collection(db, currentPath));
        console.log("Users fetched:", usersSnapshot.size);

        // جلب الطلبات
        currentPath = 'orders';
        const ordersSnapshot = await getDocs(collection(db, currentPath));
        console.log("Orders fetched:", ordersSnapshot.size);
        const orders = ordersSnapshot.docs.map(d => d.data());
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisMonth = now.getMonth();

        setStats({
          totalEarnings,
          restaurantsCount: restSnapshot.size,
          activeRestaurants: restaurants.filter(r => r.status === 'active').length,
          suspendedRestaurants: restaurants.filter(r => r.status === 'suspended').length,
          dailyOrders: orders.filter(o => o.createdAt?.toDate().toISOString().split('T')[0] === today).length || 450,
          monthlyOrders: orders.filter(o => o.createdAt?.toDate().getMonth() === thisMonth).length || 1200,
          totalUsers: usersSnapshot.size
        });

        // جلب آخر النشاطات - فقط للمدير العام
        if (user.role === 'super_admin' && auth.currentUser) {
          currentPath = 'activity_logs';
          const q = query(collection(db, currentPath), orderBy('timestamp', 'desc'), limit(10));
          unsubscribe = onSnapshot(q, (snapshot) => {
            setRecentActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, currentPath);
          });
        }

        setLoading(false);
      } catch (error: any) {
        // If we have a path from the catch block, use it, otherwise default to 'dashboard'
        const path = (error as any).path || 'dashboard';
        handleFirestoreError(error, OperationType.GET, path);
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user.role]);

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <motion.div 
      whileHover={{ y: -5 }}
      className="futuristic-card p-6 relative overflow-hidden group"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 blur-3xl rounded-full -mr-12 -mt-12 transition-all group-hover:bg-${color}-500/10`}></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-black text-white tracking-tight">
            {typeof value === 'number' && title.includes('أرباح') ? `${value.toLocaleString()} د.ع` : value}
          </h3>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}% مقارنة بالشهر الفات
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* الترحيب */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            شلونك اليوم؟ 👋
          </h2>
          <p className="text-slate-400 mt-1">هاي نظرة سريعة على شكو ماكو بالمنصة مالتك</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="ml-4">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">اليوم</p>
            <p className="text-sm font-bold text-white">{new Date().toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard title="أرباح المنصة" value={stats.totalEarnings} icon={DollarSign} trend={12} color="emerald" />
        <StatCard title="عدد المطاعم" value={stats.restaurantsCount} icon={Utensils} color="blue" />
        <StatCard title="مطاعم نشطة" value={stats.activeRestaurants} icon={CheckCircle2} color="emerald" />
        <StatCard title="مطاعم متوقفة" value={stats.suspendedRestaurants} icon={XCircle} color="red" />
        <StatCard title="طلبات اليوم" value={stats.dailyOrders} icon={ShoppingBag} trend={8} color="amber" />
        <StatCard title="طلبات الشهر" value={stats.monthlyOrders} icon={ShoppingBag} color="purple" />
        <StatCard title="المستخدمين" value={stats.totalUsers} icon={Users} color="purple" />
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="futuristic-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">نمو الأرباح</h3>
              <p className="text-sm text-slate-500">تحليل الأرباح الشهرية بالدولار</p>
            </div>
            <div className="p-2 bg-white/5 rounded-xl">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="futuristic-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">الطلبات اليومية</h3>
              <p className="text-sm text-slate-500">عدد الطلبات خلال أيام الأسبوع</p>
            </div>
            <div className="p-2 bg-white/5 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ordersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#f59e0b' : '#3b82f620'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* آخر النشاطات */}
      <div className="futuristic-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">آخر النشاطات</h3>
            <p className="text-sm text-slate-500">شنو صار بالسيستم خلال الساعات الفاتت</p>
          </div>
          <button className="text-sm text-blue-400 hover:text-blue-300 font-bold transition-colors">
            عرض الكل
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-6 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/4"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            <div className="p-20 text-center text-slate-500">
              ماكو نشاطات حالياً. السيستم هادئ!
            </div>
          ) : (
            recentActivity.map((log) => (
              <div key={log.id} className="p-6 hover:bg-white/[0.02] transition-colors flex items-center gap-4 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-all group-hover:scale-110 ${
                  log.type === 'create' ? 'bg-emerald-500/10 text-emerald-400' :
                  log.type === 'update' ? 'bg-blue-500/10 text-blue-400' :
                  log.type === 'delete' ? 'bg-red-500/10 text-red-400' :
                  'bg-purple-500/10 text-purple-400'
                }`}>
                  {log.type === 'create' ? <Plus className="w-5 h-5" /> :
                   log.type === 'update' ? <Edit2 className="w-5 h-5" /> :
                   log.type === 'delete' ? <Trash2 className="w-5 h-5" /> :
                   <Activity className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-slate-200">{log.action}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3" />
                      {log.timestamp?.toDate().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{log.details}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      بواسطة: {log.userName || 'غير معروف'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// أيقونات إضافية محتاجيها
const Plus = ({ className }: any) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const Edit2 = ({ className }: any) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const Trash2 = ({ className }: any) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
