import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, deleteDoc, doc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, secondaryAuth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { User, Shield, Mail, Plus, Search, UserCheck, UserX, Trash2, Edit2, Phone, MapPin, X, Camera, Activity, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Branch, UserRole } from '../types';
import { auth } from '../firebase';
import { logActivity } from '../utils/logger';
import { useCamera } from '../components/CameraProvider';

/**
 * صفحة إدارة المستخدمين
 * تتيح للمديرين إضافة وتعديل وحذف المستخدمين وتغيير حالاتهم
 */
export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<UserProfile | null>(null);
  const { captureSnapshot } = useCamera();
  
  // حالة المستخدم الجديد
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'executive_director' as UserRole,
    password: '',
    photoURL: '',
  });

  // جلب بيانات المستخدم الحالي
  useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
        if (doc.exists()) {
          setLoggedInUser({ uid: doc.id, ...doc.data() } as UserProfile);
        }
      });
      return () => unsub();
    }
  }, []);

  // جلب البيانات من Firestore
  useEffect(() => {
    const usersPath = 'users';
    const branchesPath = 'branches';

    // جلب المستخدمين
    const usersQuery = query(collection(db, usersPath), orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, usersPath);
      setLoading(false);
    });

    // جلب الفروع للقوائم المنسدلة
    const fetchBranches = async () => {
      try {
        const snapshot = await getDocs(collection(db, branchesPath));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
        setBranches(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, branchesPath);
      }
    };

    fetchBranches();
    return () => unsubscribeUsers();
  }, []);

  // إضافة مستخدم جديد
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone && !formData.email) {
      alert('لازم تدخل رقم هاتف أو إيميل');
      return;
    }

    setAddingUser(true);
    const path = 'users';
    try {
      const snapshot = await captureSnapshot();
      
      // 1. تحديد الإيميل المستخدم للـ Auth
      let authEmail = formData.email;
      if (!authEmail && formData.phone) {
        const cleanPhone = formData.phone.trim().replace(/^0/, '');
        authEmail = `${cleanPhone}@sana.com`;
      }

      if (!authEmail) throw new Error('لا يوجد بريد إلكتروني صالح');

      // 2. إنشاء حساب في Firebase Auth (باستخدام التطبيق الثانوي)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, formData.password);
      const newUser = userCredential.user;

      // 3. حفظ البيانات في Firestore باستخدام الـ UID الجديد
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        name: formData.name,
        email: formData.email || authEmail,
        phone: formData.phone,
        role: formData.role,
        password: formData.password, // نخزنه للعرض فقط (اختياري)
        photoURL: formData.photoURL,
        status: 'active',
        createdAt: Timestamp.now(),
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'إضافة مستخدم',
          `تم إضافة مستخدم جديد باسم: ${formData.name} ودور: ${formData.role}`,
          'create',
          snapshot
        );
      }

      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert('هذا الرقم أو الإيميل مستخدم مسبقاً');
      } else {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } finally {
      setAddingUser(false);
    }
  };

  // تعديل مستخدم موجود
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const path = `users/${currentUser.uid}`;
    try {
      const snapshot = await captureSnapshot();
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...formData,
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تعديل مستخدم',
          `تم تعديل بيانات المستخدم: ${formData.name}`,
          'update',
          snapshot
        );
      }

      setShowEditModal(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // حذف مستخدم
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    const path = `users/${id}`;
    try {
      const snapshot = await captureSnapshot();
      const userToDelete = users.find(u => u.uid === id);
      await deleteDoc(doc(db, 'users', id));

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'حذف مستخدم',
          `تم حذف المستخدم: ${userToDelete?.name || id}`,
          'delete',
          snapshot
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // تغيير حالة المستخدم (نشط/معطل)
  const toggleStatus = async (id: string, currentStatus: string) => {
    const path = `users/${id}`;
    try {
      const snapshot = await captureSnapshot();
      await updateDoc(doc(db, 'users', id), {
        status: currentStatus === 'active' ? 'inactive' : 'active'
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        const userToToggle = users.find(u => u.uid === id);
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          currentStatus === 'active' ? 'تعطيل مستخدم' : 'تفعيل مستخدم',
          `تم تغيير حالة المستخدم ${userToToggle?.name} إلى ${currentStatus === 'active' ? 'معطل' : 'نشط'}`,
          'update',
          snapshot
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // تصفية المستخدمين بناءً على البحث
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone && u.phone.includes(searchTerm))
  );

  // إعادة تعيين النموذج
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'executive_director',
      password: '',
      photoURL: '',
    });
    setCurrentUser(null);
  };

  // معالجة رفع الصورة
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // فتح نافذة التعديل
  const openEditModal = (user: UserProfile) => {
    setCurrentUser(user);
    setFormData({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      password: user.password || '',
      photoURL: user.photoURL || '',
    });
    setShowEditModal(true);
  };

  // الحصول على تسمية الدور واللون
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return { label: 'مدير نظام (أنا)', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'executive_director': return { label: 'مدير تنفيذي', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'subscription_manager': return { label: 'مسؤول اشتراكات', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'restaurant_monitor': return { label: 'مراقب مطاعم', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
      case 'chain_owner': return { label: 'صاحب مطعم', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'branch_manager': return { label: 'مدير فرع', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'cashier': return { label: 'كاشير', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'kitchen': return { label: 'مطبخ', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default: return { label: 'موظف', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">إدارة المستخدمين</h2>
          <p className="text-slate-400 mt-1">إدارة صلاحيات الموظفين والوصول للنظام</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          إضافة مستخدم جديد
        </button>
      </div>

      {/* شريط البحث والجدول */}
      <div className="futuristic-card overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="البحث بالاسم، البريد، أو الهاتف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 font-medium text-right">المستخدم</th>
                <th className="px-6 py-4 font-medium text-right">الدور</th>
                <th className="px-6 py-4 font-medium text-right">التواصل</th>
                <th className="px-6 py-4 font-medium text-right">الحالة</th>
                <th className="px-6 py-4 font-medium text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <UserX className="w-10 h-10 opacity-20" />
                      <p>لا يوجد مستخدمين حالياً</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const badge = getRoleBadge(user.role);
                  return (
                    <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center text-blue-400 border border-white/5 shadow-inner overflow-hidden">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">UID: {user.uid.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-300 text-xs">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-slate-300 text-xs">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          {user.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {/* منع تعديل أو حذف مدير النظام من قبل الآخرين */}
                          {user.role === 'super_admin' && loggedInUser?.uid !== user.uid ? (
                            <Shield className="w-4 h-4 text-purple-500" title="محمي" />
                          ) : (
                            <>
                              <button 
                                onClick={() => openEditModal(user)}
                                className="p-2 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all"
                                title="تعديل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => toggleStatus(user.uid, user.status)}
                                className={`p-2 rounded-xl transition-all ${
                                  user.status === 'active' ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-emerald-500/20 text-emerald-400'
                                }`}
                                title={user.status === 'active' ? 'تعطيل' : 'تفعيل'}
                              >
                                {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleDelete(user.uid)}
                                className="p-2 hover:bg-red-500/20 rounded-xl text-red-400 transition-all"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة الإضافة / التعديل */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              {/* خلفية جمالية للنافذة */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">{showAddModal ? 'إضافة مستخدم جديد' : 'تعديل بيانات المستخدم'}</h3>
                <button 
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <form onSubmit={showAddModal ? handleAddUser : handleEditUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">الاسم الكامل</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                      placeholder="أحمد محمد"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">رقم الهاتف العراقي</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-left"
                      placeholder="07XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">البريد الإلكتروني (اختياري)</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-left"
                      placeholder="example@domain.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">الصورة الشخصية</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {formData.photoURL ? (
                          <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="user-photo-upload"
                      />
                      <label 
                        htmlFor="user-photo-upload"
                        className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-xs cursor-pointer transition-all border border-white/10"
                      >
                        رفع صورة
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">كلمة المرور (للدخول)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-left font-mono"
                      placeholder="كلمة المرور"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">الدور الوظيفي</label>
                    <select 
                      required
                      value={formData.role}
                      disabled={currentUser?.role === 'super_admin' && loggedInUser?.uid !== currentUser?.uid}
                      onChange={e => setFormData({...formData, role: e.target.value as any})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                    >
                      <option value="executive_director" className="bg-slate-900">مدير تنفيذي</option>
                      <option value="subscription_manager" className="bg-slate-900">مسؤول اشتراكات</option>
                      <option value="restaurant_monitor" className="bg-slate-900">مراقب مطاعم</option>
                      <option value="reporter" className="bg-slate-900">مراسل تقارير</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button 
                    type="submit"
                    disabled={addingUser}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : (showAddModal ? 'إنشاء المستخدم' : 'حفظ التغييرات')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
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

