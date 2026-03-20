import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { CreditCard, CheckCircle, AlertCircle, Plus, Search, Calendar, DollarSign, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subscription, Restaurant } from '../types';
import { logActivity } from '../utils/logger';
import { useCamera } from '../components/CameraProvider';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // حالات النوافذ المنبثقة
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [renewalPlan, setRenewalPlan] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const { captureSnapshot } = useCamera();

  useEffect(() => {
    // جلب سجلات الاشتراكات
    const subPath = 'subscriptions';
    const qSub = query(collection(db, subPath), orderBy('endDate', 'desc'));
    const unsubSub = onSnapshot(qSub, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
      setSubscriptions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, subPath);
      setLoading(false);
    });

    // جلب المطاعم لعملية التجديد
    const restPath = 'restaurants';
    const qRest = query(collection(db, restPath), orderBy('name'));
    const unsubRest = onSnapshot(qRest, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      setRestaurants(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, restPath);
    });

    return () => {
      unsubSub();
      unsubRest();
    };
  }, []);

  // دالة تجديد الاشتراك
  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) return;

    const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
    if (!restaurant) return;

    const subPath = 'subscriptions';
    const restPath = `restaurants/${selectedRestaurantId}`;

    try {
      const snapshot = await captureSnapshot();
      // حساب تاريخ الانتهاء الجديد
      const now = new Date();
      // إذا كان الاشتراك الحالي لم ينتهِ بعد، نبدأ من تاريخ الانتهاء الحالي
      const startDate = restaurant.subscriptionEndDate && restaurant.subscriptionEndDate.toDate() > now 
        ? restaurant.subscriptionEndDate.toDate() 
        : now;
      
      const endDate = new Date(startDate);
      let amount = 0;

      if (renewalPlan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
        amount = 100; // مثال للسعر
      } else if (renewalPlan === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
        amount = 250;
      } else if (renewalPlan === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
        amount = 900;
      }

      // 1. إضافة سجل اشتراك جديد
      await addDoc(collection(db, 'subscriptions'), {
        restaurantId: selectedRestaurantId,
        restaurantName: restaurant.name,
        plan: renewalPlan,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        amount: amount,
        status: 'active',
        createdAt: Timestamp.now()
      });

      // 2. تحديث بيانات المطعم
      await updateDoc(doc(db, 'restaurants', selectedRestaurantId), {
        status: 'active',
        subscriptionEndDate: Timestamp.fromDate(endDate)
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تجديد اشتراك',
          `تم تجديد اشتراك مطعم (${restaurant.name}) لمدة ${renewalPlan === 'monthly' ? 'شهر' : renewalPlan === 'quarterly' ? '3 أشهر' : 'سنة'} بمبلغ ${amount} د.ع`,
          'update',
          snapshot
        );
      }

      setShowRenewModal(false);
      setSelectedRestaurantId('');
      setRenewalPlan('monthly');
      
      // ملاحظة: سيتم تحديث الواجهة تلقائياً عبر onSnapshot
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, subPath);
    }
  };

  // تصفية الاشتراكات بناءً على البحث
  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // إحصائيات سريعة
  const stats = {
    active: subscriptions.filter(s => s.status === 'active').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    totalRevenue: subscriptions.reduce((acc, s) => acc + (s.amount || 0), 0)
  };

  return (
    <div className="space-y-8">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة الاشتراكات</h2>
          <p className="text-slate-400">متابعة باقات المطاعم والمدفوعات وعمليات التجديد</p>
        </div>
        <button 
          onClick={() => setShowRenewModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          تجديد اشتراك يدوي
        </button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="futuristic-card bg-emerald-500/5 border-emerald-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">اشتراكات نشطة</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="futuristic-card bg-orange-500/5 border-orange-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">اشتراكات منتهية</p>
              <p className="text-2xl font-bold">{stats.expired}</p>
            </div>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="futuristic-card bg-blue-500/5 border-blue-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">{stats.totalRevenue} د.ع</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* جدول الاشتراكات */}
      <div className="futuristic-card">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="البحث باسم المطعم..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-white/10">
                <th className="pb-4 font-medium">المطعم</th>
                <th className="pb-4 font-medium">نوع الباقة</th>
                <th className="pb-4 font-medium">تاريخ البدء</th>
                <th className="pb-4 font-medium">تاريخ الانتهاء</th>
                <th className="pb-4 font-medium">المبلغ</th>
                <th className="pb-4 font-medium">الحالة</th>
                <th className="pb-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-6"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500">
                    لا توجد سجلات اشتراكات حالياً
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 font-semibold">{sub.restaurantName || 'مطعم مجهول'}</td>
                    <td className="py-4">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold">
                        {sub.plan === 'monthly' ? 'شهري' : sub.plan === 'yearly' ? 'سنوي' : 'ربع سنوي'}
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {sub.startDate?.toDate().toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td className="py-4 text-slate-400 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {sub.endDate?.toDate().toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td className="py-4 font-mono text-emerald-400">{sub.amount || 0} د.ع</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        sub.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {sub.status === 'active' ? 'نشط' : 'منتهي'}
                      </span>
                    </td>
                    <td className="py-4">
                      <button 
                        onClick={() => {
                          setSelectedRestaurantId(sub.restaurantId);
                          setShowRenewModal(true);
                        }}
                        className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors flex items-center gap-1 text-xs"
                      >
                        <RefreshCw className="w-4 h-4" />
                        تجديد
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تجديد الاشتراك */}
      <AnimatePresence>
        {showRenewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRenewModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">تجديد اشتراك مطعم</h3>
                <button onClick={() => setShowRenewModal(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRenewSubscription} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اختر المطعم</label>
                  <select 
                    required
                    value={selectedRestaurantId}
                    onChange={e => setSelectedRestaurantId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="">اختر المطعم...</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">مدة التجديد</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRenewalPlan('monthly')}
                      className={`py-3 rounded-xl border transition-all text-sm font-bold ${
                        renewalPlan === 'monthly' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      شهر
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewalPlan('quarterly')}
                      className={`py-3 rounded-xl border transition-all text-sm font-bold ${
                        renewalPlan === 'quarterly' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      3 أشهر
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewalPlan('yearly')}
                      className={`py-3 rounded-xl border transition-all text-sm font-bold ${
                        renewalPlan === 'yearly' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      سنة
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">المبلغ المقدر:</span>
                    <span className="text-xl font-bold text-blue-400">
                      {renewalPlan === 'monthly' ? '100' : renewalPlan === 'quarterly' ? '250' : '900'} د.ع
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">سيتم تحديث تاريخ انتهاء الاشتراك تلقائياً بناءً على المدة المختارة.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    تأكيد التجديد
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowRenewModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
