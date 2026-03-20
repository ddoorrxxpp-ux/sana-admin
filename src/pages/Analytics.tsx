import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Users, Utensils, DollarSign } from 'lucide-react';
import StatCard from '../components/StatCard';

const revenueData = [
  { name: 'يناير', value: 45000 },
  { name: 'فبراير', value: 52000 },
  { name: 'مارس', value: 48000 },
  { name: 'أبريل', value: 61000 },
  { name: 'مايو', value: 55000 },
  { name: 'يونيو', value: 67000 },
];

const restaurantPerformance = [
  { name: 'مطعم النخيل', orders: 450, revenue: 12000 },
  { name: 'مطعم الشرق', orders: 380, revenue: 9500 },
  { name: 'مطعم البحر', orders: 320, revenue: 8200 },
  { name: 'مطعم السعادة', orders: 290, revenue: 7100 },
  { name: 'مطعم الذهب', orders: 250, revenue: 6300 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">التقارير والتحليلات</h2>
        <p className="text-slate-400">نظرة شاملة على أداء المنصة والمطاعم</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي المبيعات" value="328,400 د.ع" icon={DollarSign} trend={{ value: 15, isUp: true }} color="green" />
        <StatCard title="متوسط الطلبات" value="1,240 طلب" icon={TrendingUp} trend={{ value: 8, isUp: true }} color="blue" />
        <StatCard title="المطاعم النشطة" value="42 مطعم" icon={Utensils} color="purple" />
        <StatCard title="المستخدمين الجدد" value="156 مستخدم" icon={Users} trend={{ value: 5, isUp: false }} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="futuristic-card">
          <h3 className="text-lg font-bold mb-6">نمو الإيرادات الشهرية</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="futuristic-card">
          <h3 className="text-lg font-bold mb-6">أداء أفضل 5 مطاعم (عدد الطلبات)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={restaurantPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 futuristic-card">
          <h3 className="text-lg font-bold mb-6">توزيع الاشتراكات</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'شهري', value: 45 },
                    { name: 'ربع سنوي', value: 25 },
                    { name: 'سنوي', value: 30 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {['شهري', 'ربع سنوي', 'سنوي'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 futuristic-card">
          <h3 className="text-lg font-bold mb-6">أعلى المطاعم تحقيقاً للإيرادات</h3>
          <div className="space-y-4">
            {restaurantPerformance.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                    {i + 1}
                  </div>
                  <p className="font-semibold">{item.name}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-emerald-400">{item.revenue.toLocaleString()} د.ع</p>
                  <p className="text-xs text-slate-500">{item.orders} طلب</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
