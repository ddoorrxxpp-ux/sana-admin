import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useOutletContext, Navigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { 
  Activity, Search, Filter, Calendar, 
  Clock, User, Monitor, Globe, 
  ChevronLeft, ChevronRight, Plus, Edit2, 
  Trash2, LogIn, ShieldAlert, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * سجل النشاطات - باللهجة العراقية والفصحى
 * يعرض كل الحركات اللي صارت بالسيستم مع تفاصيل دقيقة
 */
export default function ActivityLogs() {
  const { user } = useOutletContext<{ user: UserProfile }>();
  
  if (user.role !== 'super_admin') {
    return <Navigate to="/" />;
  }

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const path = 'activity_logs';
    let q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));

    if (filterType !== 'all') {
      q = query(collection(db, path), where('type', '==', filterType), orderBy('timestamp', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterType]);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'create': return { icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      case 'update': return { icon: Edit2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
      case 'delete': return { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      case 'login': return { icon: LogIn, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
      default: return { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">سجل النشاطات 📜</h2>
          <p className="text-slate-400 mt-1">راقب كل شاردة وواردة تصير بالسيستم</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {['all', 'create', 'update', 'delete', 'login'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                  filterType === type 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {type === 'all' ? 'الكل' : 
                 type === 'create' ? 'إضافة' : 
                 type === 'update' ? 'تعديل' : 
                 type === 'delete' ? 'حذف' : 'دخول'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* شريط البحث */}
      <div className="futuristic-card p-6">
        <div className="relative max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="ابحث عن حركة، مستخدم، أو تفاصيل..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
          />
        </div>
      </div>

      {/* قائمة السجلات */}
      <div className="space-y-4">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="futuristic-card p-6 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded w-1/4"></div>
                <div className="h-3 bg-white/5 rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : filteredLogs.length === 0 ? (
          <div className="futuristic-card p-20 text-center text-slate-500">
            ماكو أي سجلات مطابقة للبحث مالتك.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const config = getLogIcon(log.type);
            return (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedLog(log)}
                className="futuristic-card p-6 hover:bg-white/[0.03] transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-6"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${config.bg} ${config.color} ${config.border} transition-all group-hover:scale-110 shrink-0 shadow-lg`}>
                  <config.icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-lg text-slate-200">{log.action}</h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.timestamp?.toDate().toLocaleString('ar-IQ')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-1">{log.details}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <User className="w-3.5 h-3.5" />
                      {log.userName || 'مستخدم غير معروف'}
                    </div>
                    {log.ip && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Globe className="w-3.5 h-3.5" />
                        {log.ip}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 md:border-r border-white/5 md:pr-6">
                  <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* نافذة تفاصيل السجل */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">تفاصيل الحركة</h3>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${getLogIcon(selectedLog.type).bg} ${getLogIcon(selectedLog.type).color} ${getLogIcon(selectedLog.type).border}`}>
                    {React.createElement(getLogIcon(selectedLog.type).icon, { className: 'w-8 h-8' })}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white">{selectedLog.action}</h4>
                    <p className="text-slate-400">{selectedLog.timestamp?.toDate().toLocaleString('ar-IQ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">المستخدم</p>
                      <div className="flex items-center gap-2 text-slate-200 font-bold">
                        <User className="w-4 h-4 text-blue-400" />
                        {selectedLog.userName}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">عنوان الـ IP</p>
                      <div className="flex items-center gap-2 text-slate-200 font-bold">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        {selectedLog.ip || 'غير متوفر'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">نوع الحركة</p>
                      <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black border uppercase ${getLogIcon(selectedLog.type).color} ${getLogIcon(selectedLog.type).border}`}>
                        {selectedLog.type}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">الجهاز / المتصفح</p>
                      <div className="flex items-center gap-2 text-slate-200 font-bold">
                        <Monitor className="w-4 h-4 text-purple-400" />
                        <span className="text-xs truncate max-w-[200px]">{selectedLog.device || 'غير متوفر'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">التفاصيل الكاملة</p>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-slate-300 leading-relaxed">
                    {selectedLog.details}
                  </div>
                </div>

                {selectedLog.snapshotUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">لقطة شاشة (Snapshot)</p>
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 group">
                      <img 
                        src={selectedLog.snapshotUrl} 
                        alt="Action Snapshot" 
                        className="w-full h-auto max-h-64 object-cover transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a 
                          href={selectedLog.snapshotUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm shadow-xl"
                        >
                          عرض الصورة كاملة
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedLog(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
