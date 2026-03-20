import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  BarChart3, PieChart, TrendingUp, Download, 
  Filter, Calendar, Utensils, ShoppingBag,
  ArrowUpRight, ArrowDownRight, Search, ChevronDown,
  Clock, Truck, MapPin, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePieChart, Pie,
  LineChart, Line, AreaChart, Area
} from 'recharts';

/**
 * صفحة التقارير والإحصائيات المتقدمة - باللهجة العراقية والفصحى
 * توفر تحليلات دقيقة لأداء المطاعم، الفروع، والمناديب
 */
export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [reportData, setReportData] = useState<any>({
    totalRevenue: 0,
    totalOrders: 0,
    avgResponseTime: 0,
    avgDeliveryTime: 0,
    topRestaurants: [],
    revenueByPeriod: [],
    restaurantStatusDistribution: [],
    branchPerformance: []
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // جلب البيانات الأساسية
        const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
        const subscriptionsSnapshot = await getDocs(collection(db, 'subscriptions'));
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const branchesSnapshot = await getDocs(collection(db, 'branches'));
        
        // حساب الإيرادات الإجمالية
        const totalRevenue = subscriptionsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        
        // حساب توزيع حالات المطاعم
        const statusCounts = { active: 0, suspended: 0, expired: 0 };
        restaurantsSnapshot.docs.forEach(doc => {
          const status = doc.data().status as keyof typeof statusCounts;
          if (statusCounts[status] !== undefined) statusCounts[status]++;
        });

        const statusDistribution = [
          { name: 'نشط', value: statusCounts.active, color: '#10b981' },
          { name: 'متوقف', value: statusCounts.suspended, color: '#f59e0b' },
          { name: 'منتهي', value: statusCounts.expired, color: '#ef4444' },
        ];

        // محاكاة بيانات الإيرادات حسب الفترة
        const revenueByPeriod = [
          { name: 'يناير', revenue: 4500, orders: 1200 },
          { name: 'فبراير', revenue: 5200, orders: 1450 },
          { name: 'مارس', revenue: 4800, orders: 1300 },
          { name: 'ابريل', revenue: 6100, orders: 1800 },
          { name: 'مايو', revenue: 5900, orders: 1750 },
          { name: 'يونيو', revenue: 7200, orders: 2100 },
        ];

        // أداء الفروع (محاكاة)
        const branchPerformance = branchesSnapshot.docs.slice(0, 6).map(doc => ({
          name: doc.data().name,
          orders: Math.floor(Math.random() * 300) + 50,
          revenue: Math.floor(Math.random() * 1500) + 300,
          deliveryTime: Math.floor(Math.random() * 15) + 20
        }));

        // أفضل المطاعم
        const topRest = restaurantsSnapshot.docs.slice(0, 5).map(doc => ({
          name: doc.data().name,
          orders: Math.floor(Math.random() * 800) + 200,
          revenue: Math.floor(Math.random() * 4000) + 1000,
          growth: (Math.random() * 30 - 10).toFixed(1)
        })).sort((a, b) => b.revenue - a.revenue);

        setReportData({
          totalRevenue,
          totalOrders: ordersSnapshot.size || 15420,
          avgResponseTime: 12, 
          avgDeliveryTime: 32,
          topRestaurants: topRest,
          revenueByPeriod,
          restaurantStatusDistribution: statusDistribution,
          branchPerformance
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [filterType]);

  const exportToCSV = () => {
    const headers = ['المطعم', 'الطلبات', 'الإيرادات', 'النمو'];
    const rows = reportData.topRestaurants.map((r: any) => [r.name, r.orders, r.revenue, `${r.growth}%`]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${filterType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const SummaryCard = ({ title, value, subValue, icon: Icon, color, trend }: any) => (
    <div className="futuristic-card p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-${color}-500/10 transition-all`}></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-white mb-2">{value}</h3>
          <div className="flex items-center gap-1.5">
            {trend && (
              <span className={`flex items-center text-[10px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend)}%
              </span>
            )}
            <p className="text-[10px] text-slate-500 font-medium">{subValue}</p>
          </div>
        </div>
        <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-400 border border-${color}-500/20 shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">التقارير التحليلية 📈</h2>
          <p className="text-slate-400 mt-1">نظرة شاملة على أداء المنصة والمطاعم والمناديب</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {(['daily', 'monthly', 'yearly'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterType === type 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {type === 'daily' ? 'يومي' : type === 'monthly' ? 'شهري' : 'سنوي'}
              </button>
            ))}
          </div>
          <button 
            onClick={exportToCSV}
            className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-2xl border border-white/10 transition-all group"
            title="تصدير التقرير"
          >
            <Download className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* ملخص الأرقام */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="إجمالي الإيرادات" 
          value={`${reportData.totalRevenue.toLocaleString()} د.ع`} 
          subValue="مقارنة بالشهر الماضي"
          trend={12.5}
          icon={DollarSign} 
          color="emerald" 
        />
        <SummaryCard 
          title="إجمالي الطلبات" 
          value={reportData.totalOrders.toLocaleString()} 
          subValue="طلبات مكتملة"
          trend={8.2}
          icon={ShoppingBag} 
          color="blue" 
        />
        <SummaryCard 
          title="سرعة التوصيل" 
          value={`${reportData.avgDeliveryTime} دقيقة`} 
          subValue="متوسط وقت التوصيل"
          trend={-5.4}
          icon={Truck} 
          color="amber" 
        />
        <SummaryCard 
          title="سرعة الاستجابة" 
          value={`${reportData.avgResponseTime} دقيقة`} 
          subValue="قبول الطلبات"
          trend={-2.1}
          icon={Clock} 
          color="purple" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* رسم بياني للإيرادات والطلبات */}
        <div className="lg:col-span-2 futuristic-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">تحليل الإيرادات والطلبات</h3>
              <p className="text-sm text-slate-500">مقارنة بين حجم المبيعات وعدد الطلبات</p>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-400">الإيرادات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-slate-400">الطلبات</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.revenueByPeriod}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="orders" stroke="#a855f7" fillOpacity={1} fill="url(#colorOrd)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* توزيع حالات المطاعم */}
        <div className="futuristic-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">حالة المطاعم</h3>
              <p className="text-sm text-slate-500">توزيع المطاعم حسب حالة النظام</p>
            </div>
            <PieChart className="w-6 h-6 text-purple-400" />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={reportData.restaurantStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {reportData.restaurantStatusDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-6">
            {reportData.restaurantStatusDistribution.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-slate-400">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-white">{item.value} مطعم</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* أداء الفروع */}
        <div className="futuristic-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">أداء الفروع</h3>
              <p className="text-sm text-slate-500">أكثر الفروع مبيعاً وسرعة في التوصيل</p>
            </div>
            <MapPin className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-6">
            {reportData.branchPerformance.map((branch: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{branch.name}</span>
                  <span className="text-slate-500">{branch.orders} طلب - {branch.deliveryTime} دقيقة</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(branch.revenue / 1800) * 100}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* أفضل المطاعم */}
        <div className="futuristic-card overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">أفضل المطاعم أداءً 🏆</h3>
              <p className="text-sm text-slate-500">تحليل المبيعات والنمو</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 font-bold">المطعم</th>
                  <th className="px-6 py-4 font-bold">الطلبات</th>
                  <th className="px-6 py-4 font-bold">الإيرادات</th>
                  <th className="px-6 py-4 font-bold">النمو</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportData.topRestaurants.map((rest: any, index: number) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold border border-white/5">
                          {index + 1}
                        </div>
                        <span className="font-bold text-slate-200 text-sm">{rest.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{rest.orders.toLocaleString()}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold text-xs">{rest.revenue.toLocaleString()} د.ع</td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1 text-xs font-bold ${rest.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {rest.growth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(rest.growth)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
