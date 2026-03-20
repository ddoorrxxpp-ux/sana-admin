import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Users, Phone, Plus, Search, Trash2, Power, PowerOff, Edit2, X, Mail, Lock, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChainOwner, Restaurant } from '../types';
import { logActivity } from '../utils/logger';
import { useCamera } from '../components/CameraProvider';

export default function ChainOwners() {
  const { captureSnapshot } = useCamera();
  const [chainOwners, setChainOwners] = useState<ChainOwner[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // حالات النوافذ المنبثقة
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<ChainOwner | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    restaurantIds: [] as string[],
  });

  useEffect(() => {
    const path = 'chain_owners';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChainOwner));
      setChainOwners(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    // جلب المطاعم للاختيار
    const restPath = 'restaurants';
    const qRest = query(collection(db, restPath), orderBy('name'));
    const unsubRest = onSnapshot(qRest, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      setRestaurants(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, restPath);
    });

    return () => {
      unsubscribe();
      unsubRest();
    };
  }, []);

  // إضافة مسؤول سلسلة جديد
  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'chain_owners';
    
    try {
      const snapshot = await captureSnapshot();
      const docRef = await addDoc(collection(db, path), {
        ...formData,
        status: 'active',
        createdAt: Timestamp.now(),
      });

      // ربط المطاعم بهذا المسؤول
      for (const rid of formData.restaurantIds) {
        await updateDoc(doc(db, 'restaurants', rid), {
          ownerUid: docRef.id
        });
      }
      
      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'إضافة مسؤول سلسلة',
          `تم إضافة مسؤول سلسلة جديد باسم: ${formData.name}`,
          'create',
          snapshot
        );
      }

      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', password: '', restaurantIds: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // تعديل مسؤول سلسلة
  const handleEditOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;

    const path = `chain_owners/${selectedOwner.id}`;
    
    try {
      const snapshot = await captureSnapshot();
      await updateDoc(doc(db, 'chain_owners', selectedOwner.id), {
        ...formData,
      });

      // تحديث ربط المطاعم
      // أولاً: إزالة الملكية من المطاعم التي كانت مرتبطة ولم تعد كذلك
      const oldRids = selectedOwner.restaurantIds || [];
      const removedRids = oldRids.filter(rid => !formData.restaurantIds.includes(rid));
      for (const rid of removedRids) {
        await updateDoc(doc(db, 'restaurants', rid), {
          ownerUid: ''
        });
      }

      // ثانياً: إضافة الملكية للمطاعم الجديدة
      for (const rid of formData.restaurantIds) {
        await updateDoc(doc(db, 'restaurants', rid), {
          ownerUid: selectedOwner.id
        });
      }

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تعديل مسؤول سلسلة',
          `تم تعديل بيانات مسؤول السلسلة: ${formData.name}`,
          'update',
          snapshot
        );
      }

      setShowEditModal(false);
      setSelectedOwner(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // حذف مسؤول سلسلة
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المسؤول؟')) return;
    const path = `chain_owners/${id}`;
    try {
      const snapshot = await captureSnapshot();
      const ownerToDelete = chainOwners.find(o => o.id === id);
      await deleteDoc(doc(db, 'chain_owners', id));

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'حذف مسؤول سلسلة',
          `تم حذف مسؤول السلسلة: ${ownerToDelete?.name || id}`,
          'delete',
          snapshot
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // تغيير الحالة
  const toggleStatus = async (id: string, currentStatus: string) => {
    const path = `chain_owners/${id}`;
    try {
      const snapshot = await captureSnapshot();
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'chain_owners', id), {
        status: newStatus
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        const owner = chainOwners.find(o => o.id === id);
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تغيير حالة مسؤول سلسلة',
          `تم تغيير حالة مسؤول السلسلة (${owner?.name}) إلى: ${newStatus === 'active' ? 'نشط' : 'معطل'}`,
          'update',
          snapshot
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // فتح نافذة التعديل
  const openEditModal = (owner: ChainOwner) => {
    setSelectedOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email || '',
      phone: owner.phone || '',
      password: owner.password || '',
      restaurantIds: owner.restaurantIds || [],
    });
    setShowEditModal(true);
  };

  const toggleRestaurantSelection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      restaurantIds: prev.restaurantIds.includes(id)
        ? prev.restaurantIds.filter(rid => rid !== id)
        : [...prev.restaurantIds, id]
    }));
  };

  const filteredOwners = chainOwners.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">مسؤولي سلاسل المطاعم</h2>
          <p className="text-slate-400">إدارة مسؤولي السلاسل وتحديد المطاعم التابعة لهم</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: '', email: '', phone: '', password: '', restaurantIds: [] });
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          إضافة مسؤول سلسلة
        </button>
      </div>

      {/* البحث والفلاتر */}
      <div className="futuristic-card">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="البحث عن مسؤول..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-colors text-sm text-white"
            />
          </div>
        </div>

        {/* جدول المسؤولين */}
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-white/10">
                <th className="pb-4 font-medium">الاسم</th>
                <th className="pb-4 font-medium">التواصل</th>
                <th className="pb-4 font-medium">المطاعم المسؤولة</th>
                <th className="pb-4 font-medium">الحالة</th>
                <th className="pb-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-6"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredOwners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500">
                    لا يوجد مسؤولين مضافين حالياً
                  </td>
                </tr>
              ) : (
                filteredOwners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4">
                      <div className="flex items-center gap-3 text-white">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="font-semibold">{owner.name}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1">
                        {owner.email && <div className="flex items-center gap-2 text-slate-300 text-sm"><Mail className="w-3 h-3" /> {owner.email}</div>}
                        {owner.phone && <div className="flex items-center gap-2 text-slate-400 text-xs font-mono"><Phone className="w-3 h-3" /> {owner.phone}</div>}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {owner.restaurantIds?.length > 0 ? (
                          owner.restaurantIds.map(rid => {
                            const rest = restaurants.find(r => r.id === rid);
                            return (
                              <span key={rid} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] border border-blue-500/20">
                                {rest?.name || 'مطعم غير معروف'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-500 text-xs italic">لا توجد مطاعم</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        owner.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {owner.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openEditModal(owner)}
                          className="p-2 hover:bg-amber-500/20 rounded-lg text-amber-400 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(owner.id, owner.status)}
                          className={`p-2 rounded-lg transition-colors ${
                            owner.status === 'active' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                          title={owner.status === 'active' ? 'تعطيل' : 'تفعيل'}
                        >
                          {owner.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDelete(owner.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إضافة مسؤول */}
      <AnimatePresence>
        {showAddModal && (
          <Modal 
            title="إضافة مسؤول سلسلة جديد" 
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddOwner}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-400">اسم المسؤول</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  placeholder="مثال: محمد علي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">رقم الهاتف العراقي</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                  placeholder="07XXXXXXXXX"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                    placeholder="كلمة المرور"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="text-sm font-medium text-slate-400 block">المطاعم التابعة للمسؤول</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/10">
                  {restaurants.map(restaurant => (
                    <button
                      key={restaurant.id}
                      type="button"
                      onClick={() => toggleRestaurantSelection(restaurant.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all text-right ${
                        formData.restaurantIds.includes(restaurant.id)
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      } border`}
                    >
                      {formData.restaurantIds.includes(restaurant.id) ? (
                        <CheckSquare className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{restaurant.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                إنشاء المسؤول
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </Modal>
        )}

        {/* نافذة تعديل مسؤول */}
        {showEditModal && (
          <Modal 
            title="تعديل بيانات المسؤول" 
            onClose={() => setShowEditModal(false)}
            onSubmit={handleEditOwner}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-400">اسم المسؤول</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">رقم الهاتف العراقي</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                  placeholder="07XXXXXXXXX"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                    placeholder="كلمة المرور"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="text-sm font-medium text-slate-400 block">المطاعم التابعة للمسؤول</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/10">
                  {restaurants.map(restaurant => (
                    <button
                      key={restaurant.id}
                      type="button"
                      onClick={() => toggleRestaurantSelection(restaurant.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all text-right ${
                        formData.restaurantIds.includes(restaurant.id)
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      } border`}
                    >
                      {formData.restaurantIds.includes(restaurant.id) ? (
                        <CheckSquare className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{restaurant.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20">
                حفظ التعديلات
              </button>
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// مكون النافذة المنبثقة (Modal)
function Modal({ title, children, onClose, onSubmit }: { title: string, children: React.ReactNode, onClose: () => void, onSubmit: (e: React.FormEvent) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      ></motion.div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          {children}
        </form>
      </motion.div>
    </div>
  );
}
