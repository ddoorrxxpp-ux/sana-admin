import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color: 'blue' | 'orange' | 'green' | 'red' | 'purple';
}

export default function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
    orange: 'from-orange-500/20 to-orange-600/5 text-orange-400 border-orange-500/20',
    green: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
    red: 'from-red-500/20 to-red-600/5 text-red-400 border-red-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden futuristic-card border ${colors[color]} flex flex-col gap-4`}
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-xl bg-white/5`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.isUp ? '+' : '-'}{trend.value}%
          </span>
        )}
      </div>
      
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
      </div>

      <div className="absolute -right-4 -bottom-4 opacity-5">
        <Icon className="w-24 h-24" />
      </div>
    </motion.div>
  );
}
