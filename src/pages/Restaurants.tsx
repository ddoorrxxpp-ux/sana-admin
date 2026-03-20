import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Restaurant, Branch, RestaurantFeatures, UserProfile, UserRole } from '../types';
import { logActivity } from '../utils/logger';
import { useCamera } from '../components/CameraProvider';
import { 
  Plus, 
  Search, 
  Utensils, 
  Phone, 
  Calendar, 
  Shield, 
  Edit2, 
  Trash2, 
  Power, 
  PowerOff,
  Eye,
  RefreshCw,
  X,
  Settings,
  QrCode,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Globe,
  MapPin,
  Key,
  Camera,
  Users,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [features, setFeatures] = useState<Record<string, RestaurantFeatures>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // حالات النوافذ المنبثقة
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { captureSnapshot } = useCamera();
  
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    role: 'cashier' as UserRole,
    password: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    logo: '',
    address: '',
    governorate: 'بغداد',
    subscriptionDays: 30,
    password: '',
    email: '',
    passwordAuth: '',
  });

  const governorates = [
    'بغداد', 'أربيل', 'البصرة', 'الموصل', 'النجف', 'كربلاء', 'السليمانية', 'دهوك', 
    'كركوك', 'بابل', 'الأنبار', 'ديالى', 'ذي قار', 'القادسية', 'ميسان', 'واسط', 'المثنى', 'صلاح الدين'
  ];

  // جلب البيانات
  useEffect(() => {
    const path = 'restaurants';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    // جلب المطاعم
    const unsubscribeRest = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      setRestaurants(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    // جلب الفروع لحساب عددها
    const unsubscribeBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(data);
    });

    // جلب الميزات
    const unsubscribeFeatures = onSnapshot(collection(db, 'restaurant_features'), (snapshot) => {
      const data: Record<string, RestaurantFeatures> = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data() as RestaurantFeatures;
      });
      setFeatures(data);
    });

    return () => {
      unsubscribeRest();
      unsubscribeBranches();
      unsubscribeFeatures();
    };
  }, []);

  // تصفية المطاعم
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // توليد رابط فريد للمطعم
  const generateUniqueUrl = (name: string, address: string) => {
    const baseSlug = name.replace(/\s+/g, '-').toLowerCase();
    const existingCount = restaurants.filter(r => r.name.toLowerCase() === name.toLowerCase()).length;
    
    if (existingCount > 0) {
      // إذا وجد اسم مشابه، نضيف العنوان أو رقم تسلسلي
      const addressSlug = address.replace(/\s+/g, '-').toLowerCase();
      return `https://menu.iraq-saas.com/${baseSlug}-${addressSlug || existingCount + 1}`;
    }
    
    return `https://menu.iraq-saas.com/${baseSlug}`;
  };

  // معالجة رفع اللوكو
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // إضافة مطعم جديد
  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const snapshot = await captureSnapshot();

    // التحقق من رقم الهاتف العراقي (12 رقم)
    if (formData.phone.length !== 11) {
      setErrorMessage('رقم الهاتف العراقي يجب أن يتكون من 11 رقم (مثال: 07XXXXXXXXX)');
      return;
    }

    if (formData.password.length < 4) {
      setErrorMessage('كلمة المرور يجب أن تكون 4 رموز على الأقل');
      return;
    }
    
    const path = 'restaurants';
    try {
      // حساب تاريخ انتهاء الاشتراك
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + Number(formData.subscriptionDays));

      const menuUrl = generateUniqueUrl(formData.name, formData.address);

      const restaurantRef = await addDoc(collection(db, path), {
        name: formData.name,
        phone: formData.phone,
        logo: formData.logo,
        address: formData.address,
        governorate: formData.governorate,
        password: formData.password,
        subscriptionDays: Number(formData.subscriptionDays),
        status: 'active',
        createdAt: Timestamp.now(),
        subscriptionEndDate: Timestamp.fromDate(endDate),
        ownerUid: auth.currentUser.uid,
        menuUrl: menuUrl,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${menuUrl}`
      });

      // إنشاء الميزات الافتراضية
      await setDoc(doc(db, 'restaurant_features', restaurantRef.id), {
        restaurantId: restaurantRef.id,
        menu: true,
        pos: false,
        tables: false,
        kitchen: false,
        delivery: false,
        drivers: false,
        reports: false,
        printers: false,
        maps: false // الخرائط غير متاحة حالياً بشكل افتراضي
      });
      
      setShowAddModal(false);
      setErrorMessage(null);
      
      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'إضافة مطعم',
          `تم إضافة مطعم جديد باسم: ${formData.name}`,
          'create',
          snapshot
        );
      }

      setFormData({ 
        name: '', 
        phone: '', 
        logo: '', 
        address: '', 
        governorate: 'بغداد', 
        subscriptionDays: 30, 
        password: '',
        email: '',
        passwordAuth: ''
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const [featureData, setFeatureData] = useState<RestaurantFeatures>({
    restaurantId: '',
    menu: true,
    pos: false,
    tables: false,
    kitchen: false,
    delivery: false,
    drivers: false,
    reports: false,
    printers: false
  });

  // حذف مطعم
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setRestaurantToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!restaurantToDelete) return;
    const id = restaurantToDelete;
    const path = `restaurants/${id}`;
    try {
      const snapshot = await captureSnapshot();
      await deleteDoc(doc(db, 'restaurants', id));
      await deleteDoc(doc(db, 'restaurant_features', id));

      // تسجيل النشاط
      if (auth.currentUser) {
        const rest = restaurants.find(r => r.id === id);
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'حذف مطعم',
          `تم حذف مطعم: ${rest?.name || id}`,
          'delete',
          snapshot
        );
      }
      setShowDeleteConfirm(false);
      setRestaurantToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // تغيير الحالة (تفعيل/تعطيل)
  const toggleStatus = async (id: string, currentStatus: string) => {
    const path = `restaurants/${id}`;
    try {
      const snapshot = await captureSnapshot();
      await updateDoc(doc(db, 'restaurants', id), {
        status: currentStatus === 'active' ? 'suspended' : 'active'
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        const rest = restaurants.find(r => r.id === id);
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          currentStatus === 'active' ? 'تعطيل مطعم' : 'تفعيل مطعم',
          `تم تغيير حالة مطعم ${rest?.name} إلى ${currentStatus === 'active' ? 'معطل' : 'نشط'}`,
          'update',
          snapshot
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // تعديل مطعم
  const handleEditRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    const path = `restaurants/${selectedRestaurant.id}`;
    try {
      const snapshot = await captureSnapshot();
      await updateDoc(doc(db, 'restaurants', selectedRestaurant.id), {
        name: formData.name,
        phone: formData.phone,
        logo: formData.logo,
        address: formData.address,
        governorate: formData.governorate,
        password: formData.password,
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تعديل مطعم',
          `تم تعديل بيانات مطعم: ${formData.name}`,
          'update',
          snapshot
        );
      }

      setShowEditModal(false);
      setSelectedRestaurant(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // تحديث الميزات
  const handleUpdateFeatures = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    const path = `restaurant_features/${selectedRestaurant.id}`;
    try {
      const snapshot = await captureSnapshot();
      await setDoc(doc(db, 'restaurant_features', selectedRestaurant.id), featureData);

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تعديل ميزات المطعم',
          `تم تحديث ميزات مطعم: ${selectedRestaurant.name}`,
          'update',
          snapshot
        );
      }

      setShowFeaturesModal(false);
      setSelectedRestaurant(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // فتح نافذة الميزات
  const openFeaturesModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    const currentFeatures = features[restaurant.id] || {
      restaurantId: restaurant.id,
      menu: true,
      pos: false,
      tables: false,
      kitchen: false,
      delivery: false,
      drivers: false,
      reports: false,
      printers: false,
      maps: false
    };
    setFeatureData(currentFeatures);
    setShowFeaturesModal(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      phone: restaurant.phone,
      logo: restaurant.logo || '',
      address: restaurant.address || '',
      governorate: restaurant.governorate || 'بغداد',
      subscriptionDays: restaurant.subscriptionDays || 30,
      password: restaurant.password || '',
      email: '',
      passwordAuth: '',
    });
    setShowEditModal(true);
  };

  // فتح نافذة العرض
  const openViewModal = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowViewModal(true);
  };

  // تجديد الاشتراك
  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    
    const path = `restaurants/${selectedRestaurant.id}`;
    try {
      const snapshot = await captureSnapshot();
      const currentEnd = selectedRestaurant.subscriptionEndDate?.toDate() || new Date();
      const newEnd = new Date(currentEnd > new Date() ? currentEnd : new Date());
      newEnd.setDate(newEnd.getDate() + Number(formData.subscriptionDays));

      await updateDoc(doc(db, 'restaurants', selectedRestaurant.id), {
        subscriptionEndDate: Timestamp.fromDate(newEnd),
        status: 'active'
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تجديد اشتراك',
          `تم تجديد اشتراك مطعم ${selectedRestaurant.name} لمدة ${formData.subscriptionDays} يوم`,
          'update',
          snapshot
        );
      }

      setShowRenewModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // إدارة الموظفين
  const openEmployeesModal = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    // في الواقع، يجب تصفية المستخدمين حسب المطعم، لكن هنا نفترض أنهم مرتبطين بـ restaurantId
    setEmployees(allUsers.filter(u => u.branchId === restaurant.id));
    setShowEmployeesModal(true);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    try {
      const snapshot = await captureSnapshot();
      await addDoc(collection(db, 'users'), {
        ...employeeFormData,
        branchId: selectedRestaurant.id,
        branchName: selectedRestaurant.name,
        status: 'active',
        createdAt: Timestamp.now(),
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'إضافة موظف مطعم',
          `تم إضافة موظف جديد (${employeeFormData.name}) لمطعم ${selectedRestaurant.name}`,
          'create',
          snapshot
        );
      }

      setEmployeeFormData({ name: '', role: 'cashier', password: '' });
      openEmployeesModal(selectedRestaurant);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      const snapshot = await captureSnapshot();
      await deleteDoc(doc(db, 'users', id));
      
      if (auth.currentUser && selectedRestaurant) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'حذف موظف مطعم',
          `تم حذف موظف من مطعم ${selectedRestaurant.name}`,
          'delete',
          snapshot
        );
      }
      
      if (selectedRestaurant) openEmployeesModal(selectedRestaurant);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المطاعم</h2>
          <p className="text-slate-400">عرض وإدارة جميع المطاعم والتحكم بميزاتها</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          إضافة مطعم جديد
        </button>
      </div>

      {/* الفلاتر والبحث */}
      <div className="futuristic-card">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="ابحث باسم المطعم أو رقم الهاتف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">معطل</option>
            <option value="expired">منتهي</option>
          </select>
        </div>

        {/* جدول المطاعم */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-white/10">
                <th className="pb-4 font-medium pr-4">اسم المطعم</th>
                <th className="pb-4 font-medium">الهاتف</th>
                <th className="pb-4 font-medium">المحافظة</th>
                <th className="pb-4 font-medium text-center">الفروع</th>
                <th className="pb-4 font-medium">حالة الاشتراك</th>
                <th className="pb-4 font-medium pl-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-6"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500">
                    <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    لا توجد مطاعم تطابق البحث
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((restaurant) => {
                  const restaurantBranches = branches.filter(b => b.restaurantId === restaurant.id);
                  const isExpired = restaurant.subscriptionEndDate?.toDate() < new Date();
                  
                  return (
                    <tr key={restaurant.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 overflow-hidden">
                            {restaurant.logo ? (
                              <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Utensils className="w-5 h-5 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold block">{restaurant.name}</span>
                            <span className="text-[10px] text-slate-500">منذ: {restaurant.createdAt?.toDate().toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-400 font-mono text-sm">{restaurant.phone}</td>
                      <td className="py-4 text-slate-400 text-sm">{restaurant.governorate}</td>
                      <td className="py-4 text-center">
                        <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-md text-xs">
                          {restaurantBranches.length}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                          restaurant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          restaurant.status === 'expired' || isExpired ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            restaurant.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'
                          }`}></div>
                          {restaurant.status === 'active' ? 'نشط' : 
                           restaurant.status === 'suspended' ? 'معطل' : 'منتهي'}
                        </span>
                      </td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openViewModal(restaurant)}
                            className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openFeaturesModal(restaurant)}
                            className="p-2 hover:bg-purple-500/10 text-purple-400 rounded-lg transition-colors"
                            title="التحكم بالميزات"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEmployeesModal(restaurant)}
                            className="p-2 hover:bg-indigo-500/10 text-indigo-400 rounded-lg transition-colors"
                            title="إدارة الموظفين"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditModal(restaurant)}
                            className="p-2 hover:bg-amber-500/10 text-amber-400 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedRestaurant(restaurant);
                              setFormData({ ...formData, subscriptionDays: 30 });
                              setShowRenewModal(true);
                            }}
                            className="p-2 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors"
                            title="تجديد الاشتراك"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleStatus(restaurant.id, restaurant.status)}
                            className={`p-2 rounded-lg transition-colors ${
                              restaurant.status === 'active' 
                                ? 'hover:bg-red-500/10 text-red-400' 
                                : 'hover:bg-emerald-500/10 text-emerald-400'
                            }`}
                            title={restaurant.status === 'active' ? 'تعطيل' : 'تفعيل'}
                          >
                            {restaurant.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDelete(restaurant.id)}
                            className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* نافذة تأكيد الحذف */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">تأكيد الحذف</h3>
              <p className="text-slate-400 mb-8">
                هل أنت متأكد من حذف هذا المطعم؟ سيتم حذف جميع البيانات المرتبطة به ولا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                  نعم، احذف
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة إضافة مطعم */}
      <AnimatePresence>
        {showAddModal && (
          <Modal 
            title="إضافة مطعم جديد" 
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddRestaurant}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اسم المطعم</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="مثال: مطعم النخيل"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اللوكو (Logo)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {formData.logo ? (
                        <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label 
                      htmlFor="logo-upload"
                      className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-xs cursor-pointer transition-all border border-white/10"
                    >
                      رفع صورة
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">رقم الهاتف العراقي (11 رقم)</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="07XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">كلمة المرور (للدخول)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="كلمة المرور"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">المحافظة</label>
                  <select 
                    value={formData.governorate}
                    onChange={e => setFormData({...formData, governorate: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    {governorates.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">مدة الاشتراك (بالأيام)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={formData.subscriptionDays}
                    onChange={e => setFormData({...formData, subscriptionDays: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">عنوان المطعم بالتفصيل</label>
                <textarea 
                  required
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all h-20 resize-none"
                  placeholder="الشارع، المنطقة، أقرب نقطة دالة..."
                />
              </div>

              <div className="border-t border-white/10 pt-4 mt-4">
                <h4 className="text-sm font-bold text-blue-400 mb-4">بيانات صاحب السلسلة (اختياري)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">البريد الإلكتروني</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                      placeholder="owner@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                      placeholder="********"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all">
                إنشاء المطعم
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* نافذة التحكم بالميزات */}
      <AnimatePresence>
        {showFeaturesModal && selectedRestaurant && (
          <Modal 
            title={`ميزات مطعم: ${selectedRestaurant.name}`} 
            onClose={() => setShowFeaturesModal(false)}
            onSubmit={handleUpdateFeatures}
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'menu', label: 'المنيو الإلكتروني', icon: QrCode },
                { id: 'pos', label: 'نظام الكاشير (POS)', icon: Utensils },
                { id: 'tables', label: 'إدارة الطاولات', icon: Utensils },
                { id: 'kitchen', label: 'شاشة المطبخ', icon: Utensils },
                { id: 'delivery', label: 'نظام التوصيل', icon: Utensils },
                { id: 'drivers', label: 'إدارة المناديب', icon: Utensils },
                { id: 'reports', label: 'التقارير المتقدمة', icon: Settings },
                { id: 'printers', label: 'ربط الطابعات', icon: Settings },
                { id: 'maps', label: 'الخرائط والتتبع', icon: Globe },
              ].map((feature) => (
                <div 
                  key={feature.id}
                  onClick={() => setFeatureData({ ...featureData, [feature.id]: !featureData[feature.id as keyof RestaurantFeatures] })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center gap-2 ${
                    featureData[feature.id as keyof RestaurantFeatures] 
                      ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' 
                      : 'bg-white/5 border-white/10 text-slate-500'
                  }`}
                >
                  <feature.icon className="w-6 h-6" />
                  <span className="text-xs font-bold">{feature.label}</span>
                  {featureData[feature.id as keyof RestaurantFeatures] ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all">
                حفظ الإعدادات
              </button>
              <button type="button" onClick={() => setShowFeaturesModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* نافذة عرض التفاصيل */}
      <AnimatePresence>
        {showViewModal && selectedRestaurant && (
          <Modal 
            title="تفاصيل المطعم" 
            onClose={() => setShowViewModal(false)}
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 overflow-hidden">
                  {selectedRestaurant.logo ? (
                    <img src={selectedRestaurant.logo} alt={selectedRestaurant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Utensils className="w-8 h-8 text-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold">{selectedRestaurant.name}</h4>
                  <p className="text-slate-400 text-sm">{selectedRestaurant.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">العنوان</span>
                  </div>
                  <p className="text-sm font-medium">{selectedRestaurant.address}</p>
                  <p className="text-xs text-slate-400">{selectedRestaurant.governorate}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Key className="w-4 h-4" />
                    <span className="text-xs">كلمة المرور</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-blue-400">{selectedRestaurant.password}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-xs text-slate-500 mb-1">عدد الفروع</p>
                  <p className="text-lg font-bold">{branches.filter(b => b.restaurantId === selectedRestaurant.id).length}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-xs text-slate-500 mb-1">الاشتراك المتبقي</p>
                  <p className="text-lg font-bold text-blue-400">{selectedRestaurant.subscriptionDays} يوم</p>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <QrCode className="w-4 h-4" />
                    <span className="text-sm">QR المنيو</span>
                  </div>
                  <a href={selectedRestaurant.menuUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="flex justify-center p-4 bg-white rounded-xl">
                  <img src={selectedRestaurant.qrCode} alt="QR Code" className="w-32 h-32" />
                </div>
                <p className="text-[10px] text-center text-slate-500 break-all">{selectedRestaurant.menuUrl}</p>
              </div>
            </div>
            <div className="mt-8">
              <button 
                type="button" 
                onClick={() => setShowViewModal(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all"
              >
                إغلاق
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* نافذة تجديد الاشتراك */}
      <AnimatePresence>
        {showRenewModal && selectedRestaurant && (
          <Modal 
            title={`تجديد اشتراك: ${selectedRestaurant.name}`} 
            onClose={() => setShowRenewModal(false)}
            onSubmit={handleRenew}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          >
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <p className="text-sm text-blue-400 text-center">
                  سيتم إضافة المدة الجديدة إلى تاريخ انتهاء الاشتراك الحالي
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">مدة التجديد (بالأيام)</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={formData.subscriptionDays}
                  onChange={e => setFormData({...formData, subscriptionDays: Number(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="30"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all">
                تأكيد التجديد
              </button>
              <button type="button" onClick={() => setShowRenewModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* نافذة إدارة الموظفين */}
      <AnimatePresence>
        {showEmployeesModal && selectedRestaurant && (
          <Modal 
            title={`موظفي مطعم: ${selectedRestaurant.name}`} 
            onClose={() => setShowEmployeesModal(false)}
            onSubmit={handleAddEmployee}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          >
            <div className="space-y-6">
              {/* نموذج إضافة موظف */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  إضافة موظف جديد
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="اسم الموظف"
                    required
                    value={employeeFormData.name}
                    onChange={e => setEmployeeFormData({...employeeFormData, name: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                  <input 
                    type="text" 
                    placeholder="كلمة المرور"
                    required
                    value={employeeFormData.password}
                    onChange={e => setEmployeeFormData({...employeeFormData, password: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>
                <select 
                  value={employeeFormData.role}
                  onChange={e => setEmployeeFormData({...employeeFormData, role: e.target.value as any})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50"
                >
                  <option value="cashier" className="bg-slate-900">كاشير</option>
                  <option value="kitchen" className="bg-slate-900">مطبخ</option>
                  <option value="driver" className="bg-slate-900">مندوب توصيل</option>
                  <option value="waiter" className="bg-slate-900">ويتر (نادل)</option>
                  <option value="tables" className="bg-slate-900">مسؤول طاولات</option>
                </select>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-50 text-white py-2 rounded-xl text-sm font-bold transition-all">
                  إضافة الموظف
                </button>
              </div>

              {/* قائمة الموظفين */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {employees.length === 0 ? (
                  <p className="text-center text-slate-500 py-4 text-sm italic">لا يوجد موظفين مضافين حالياً</p>
                ) : (
                  employees.map(emp => (
                    <div key={emp.uid} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/20">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{emp.name}</p>
                          <p className="text-[10px] text-slate-500">{emp.role} • كلمة المرور: {emp.password}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteEmployee(emp.uid)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* نافذة تعديل مطعم */}
      <AnimatePresence>
        {showEditModal && selectedRestaurant && (
          <Modal 
            title="تعديل بيانات المطعم" 
            onClose={() => setShowEditModal(false)}
            onSubmit={handleEditRestaurant}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اسم المطعم</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اللوكو (Logo)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {formData.logo ? (
                        <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="edit-logo-upload"
                    />
                    <label 
                      htmlFor="edit-logo-upload"
                      className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-xs cursor-pointer transition-all border border-white/10"
                    >
                      تغيير الصورة
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                  <input 
                    type="text" 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">المحافظة</label>
                <select 
                  value={formData.governorate}
                  onChange={e => setFormData({...formData, governorate: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all"
                >
                  {governorates.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">العنوان</label>
                <textarea 
                  required
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl transition-all">
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
function Modal({ title, children, onClose, onSubmit, errorMessage, onClearError }: { title: string, children: React.ReactNode, onClose: () => void, onSubmit: (e: React.FormEvent) => void, errorMessage?: string | null, onClearError?: () => void }) {
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
        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-3"
          >
            <p className="text-sm text-red-400 font-medium">{errorMessage}</p>
            <button onClick={onClearError} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <form onSubmit={onSubmit}>
          {children}
        </form>
      </motion.div>
    </div>
  );
}
