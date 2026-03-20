import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Truck, Phone, Plus, Search, Trash2, Power, PowerOff, Eye, Edit2, X, Map as MapIcon, Navigation, User, XCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { Driver, RestaurantFeatures } from '../types';
import { logActivity } from '../utils/logger';

import { useCamera } from '../components/CameraProvider';

const MAP_CENTER = { lat: 33.3152, lng: 44.3661 }; // بغداد
const mapContainerStyle = { width: '100%', height: '500px', borderRadius: '1.5rem' };

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedDriverOnMap, setSelectedDriverOnMap] = useState<Driver | null>(null);
  
  // حالات النوافذ المنبثقة
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    restaurantId: '',
    address: '',
    password: '',
    photoURL: '',
  });

  const { isLoaded, loadError } = useGoogleMaps();

  const [isSimulating, setIsSimulating] = useState(false);
  const [restaurantFeatures, setRestaurantFeatures] = useState<RestaurantFeatures | null>(null);

  const { captureSnapshot } = useCamera();

  // جلب ميزات المطعم
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // في حالة الأدمن العام، قد نحتاج لمنطق مختلف، لكن هنا نفترض أننا نتحقق من ميزات المطعم المختار أو الحالي
    // للتبسيط، سنبحث عن ميزات أول مطعم إذا كان المستخدم سوبر أدمن، أو مطعم المستخدم الحالي
    const fetchFeatures = async () => {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      const userData = userDoc.data();
      const restaurantId = userData?.restaurantId;

      if (restaurantId) {
        const unsubscribe = onSnapshot(doc(db, 'restaurant_features', restaurantId), (doc) => {
          if (doc.exists()) {
            setRestaurantFeatures(doc.data() as RestaurantFeatures);
          }
        });
        return unsubscribe;
      }
    };

    fetchFeatures();
  }, []);

  const mapsEnabled = restaurantFeatures?.maps ?? true; // افتراضياً نعم للأدمن، لكن سنقيدها لاحقاً

  // محاكاة حركة المناديب (للعرض فقط)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      const onlineDriversWithLoc = drivers.filter(d => d.status !== 'offline' && d.currentLocation);
      if (onlineDriversWithLoc.length === 0) return;

      const randomDriver = onlineDriversWithLoc[Math.floor(Math.random() * onlineDriversWithLoc.length)];
      const newLat = randomDriver.currentLocation!.lat + (Math.random() - 0.5) * 0.001;
      const newLng = randomDriver.currentLocation!.lng + (Math.random() - 0.5) * 0.001;

      try {
        await updateDoc(doc(db, 'drivers', randomDriver.id), {
          currentLocation: { lat: newLat, lng: newLng }
        });
      } catch (error) {
        console.error("Error simulating movement:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating, drivers]);

  const getMarkerIcon = (status: string) => {
    const color = status === 'busy' ? '#f59e0b' : '#10b981';
    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#ffffff',
      scale: 2,
      anchor: isLoaded ? new google.maps.Point(12, 24) : undefined,
    };
  };

  const apiKeyMissing = !(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

  const onMapLoad = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  };

  const centerOnDriver = (driver: Driver) => {
    if (driver.currentLocation && map) {
      map.panTo(driver.currentLocation);
      map.setZoom(15);
      setSelectedDriverOnMap(driver);
      
      // Scroll to map
      const mapElement = document.getElementById('tracking-map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (loadError) {
    console.error("Google Maps Load Error:", loadError);
  }

  useEffect(() => {
    const path = 'drivers';
    const q = query(collection(db, path), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
      setDrivers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    // جلب المطاعم للقائمة المنسدلة
    const restPath = 'restaurants';
    const qRest = query(collection(db, restPath), orderBy('name'));
    const unsubRest = onSnapshot(qRest, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setRestaurants(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, restPath);
    });

    return () => {
      unsubscribe();
      unsubRest();
    };
  }, []);

  // إضافة مندوب جديد
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const path = 'drivers';
    try {
      const snapshot = await captureSnapshot();
      await addDoc(collection(db, path), {
        ...formData,
        status: 'offline',
        createdAt: Timestamp.now(),
        ownerUid: auth.currentUser.uid,
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'إضافة مندوب',
          `تم إضافة مندوب جديد باسم: ${formData.name}`,
          'create',
          snapshot
        );
      }

      setShowAddModal(false);
      setFormData({ name: '', phone: '', restaurantId: '', address: '', password: '', photoURL: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // تعديل مندوب
  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    const path = `drivers/${selectedDriver.id}`;
    try {
      const snapshot = await captureSnapshot();
      await updateDoc(doc(db, 'drivers', selectedDriver.id), {
        ...formData
      });

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تعديل مندوب',
          `تم تعديل بيانات المندوب: ${formData.name}`,
          'update',
          snapshot
        );
      }

      setShowEditModal(false);
      setSelectedDriver(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // حذف مندوب
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المندوب؟')) return;
    const path = `drivers/${id}`;
    try {
      const snapshot = await captureSnapshot();
      const driverToDelete = drivers.find(d => d.id === id);
      await deleteDoc(doc(db, 'drivers', id));

      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'حذف مندوب',
          `تم حذف المندوب: ${driverToDelete?.name || id}`,
          'delete',
          snapshot
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // فتح نافذة التعديل
  const openEditModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      restaurantId: driver.restaurantId || '',
      address: driver.address || '',
      password: driver.password || '',
      photoURL: driver.photoURL || '',
    });
    setShowEditModal(true);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone.includes(searchTerm)
  );

  const onlineDrivers = drivers.filter(d => d.status !== 'offline' && d.currentLocation);

  return (
    <div className="space-y-8">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">مراقبة المناديب</h2>
          <p className="text-slate-400">تتبع مواقع المناديب وحالات الطلبات مباشرة على الخريطة</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: '', phone: '', restaurantId: '', address: '', password: '', photoURL: '' });
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          إضافة مندوب جديد
        </button>
      </div>

      {/* الخريطة التفاعلية */}
      {mapsEnabled ? (
        <div id="tracking-map" className="futuristic-card p-0 overflow-hidden border-blue-500/20 shadow-blue-500/10 shadow-2xl">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white">خريطة التتبع المباشر</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-3 py-1 rounded-full border transition-all ${
                  isSimulating 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                    : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
                }`}
              >
                {isSimulating ? 'إيقاف المحاكاة' : 'محاكاة الحركة'}
              </button>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-slate-400">متصل ({drivers.filter(d => d.status === 'online').length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-slate-400">مشغول ({drivers.filter(d => d.status === 'busy').length})</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            {loadError || apiKeyMissing ? (
              <div className="w-full h-[500px] bg-red-500/5 flex flex-col items-center justify-center p-12 text-center border border-red-500/10 rounded-[1.5rem]">
                <div className="p-4 bg-red-500/10 rounded-full mb-6">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
                <h4 className="text-2xl font-black text-white mb-3">
                  {apiKeyMissing ? 'مفتاح الخرائط مفقود 🔑' : 'خطأ في تحميل الخريطة 🗺️'}
                </h4>
                <p className="text-slate-400 max-w-md leading-relaxed">
                  {apiKeyMissing 
                    ? 'يرجى إضافة VITE_GOOGLE_MAPS_API_KEY في إعدادات الأسرار (Secrets) لتفعيل الخرائط.' 
                    : 'يبدو أن خدمة "Maps JavaScript API" غير مفعلة في مشروعك على Google Cloud. هذا الخطأ (ApiProjectMapError) يتطلب تفعيل الخدمة يدوياً.'}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/api/maps-backend.googleapis.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    {apiKeyMissing ? 'فتح لوحة التحكم' : 'تفعيل الخدمة الآن'}
                  </a>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-bold"
                  >
                    إعادة تحميل الصفحة
                  </button>
                </div>
              </div>
            ) : isLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={MAP_CENTER}
                zoom={12}
                onLoad={onMapLoad}
                options={{
                  disableDefaultUI: false,
                  styles: [
                    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                    {
                      featureType: 'administrative.locality',
                      elementType: 'labels.text.fill',
                      stylers: [{ color: '#d59563' }]
                    },
                    {
                      featureType: 'poi',
                      elementType: 'labels.text.fill',
                      stylers: [{ color: '#d59563' }]
                    },
                    {
                      featureType: 'road',
                      elementType: 'geometry',
                      stylers: [{ color: '#38414e' }]
                    },
                    {
                      featureType: 'road',
                      elementType: 'geometry.stroke',
                      stylers: [{ color: '#212a37' }]
                    },
                    {
                      featureType: 'water',
                      elementType: 'geometry',
                      stylers: [{ color: '#17263c' }]
                    },
                  ]
                }}
              >
                {onlineDrivers.map(driver => (
                  <Marker
                    key={driver.id}
                    position={driver.currentLocation!}
                    icon={getMarkerIcon(driver.status)}
                    onClick={() => setSelectedDriverOnMap(driver)}
                  />
                ))}

                {selectedDriverOnMap && (
                  <InfoWindow
                    position={selectedDriverOnMap.currentLocation!}
                    onCloseClick={() => setSelectedDriverOnMap(null)}
                  >
                    <div className="p-2 min-w-[150px] text-right">
                      <h4 className="font-bold text-slate-900">{selectedDriverOnMap.name}</h4>
                      <p className="text-xs text-slate-600 mt-1">{selectedDriverOnMap.phone}</p>
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          selectedDriverOnMap.status === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {selectedDriverOnMap.status === 'busy' ? 'في طلب حالي' : 'متاح للطلب'}
                        </span>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="w-full h-[500px] bg-white/5 flex items-center justify-center text-slate-500 italic">
                جاري تحميل الخريطة...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="futuristic-card p-12 text-center">
          <Globe className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-bold text-white mb-2">الخرائط غير مفعلة</h3>
          <p className="text-slate-400">خدمة الخرائط والتتبع المباشر غير مفعلة لهذا المطعم حالياً.</p>
        </div>
      )}

      {/* قائمة المناديب */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="futuristic-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                قائمة المناديب
              </h3>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="بحث عن مندوب..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pr-10 pl-3 focus:outline-none focus:border-blue-500/50 text-sm text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-white/10">
                    <th className="pb-4 font-medium">المندوب</th>
                    <th className="pb-4 font-medium">الهاتف</th>
                    <th className="pb-4 font-medium">المطعم</th>
                    <th className="pb-4 font-medium">الحالة</th>
                    <th className="pb-4 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="py-4"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 text-sm italic">
                        لا يوجد مناديب مضافين
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 overflow-hidden">
                              {driver.photoURL ? (
                                <img src={driver.photoURL} alt={driver.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-white text-sm block">{driver.name}</span>
                              <span className="text-[10px] text-slate-500 block">{driver.address || 'لا يوجد عنوان'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-slate-400 font-mono text-xs">{driver.phone}</td>
                        <td className="py-4 text-slate-400 text-xs">
                          {restaurants.find(r => r.id === driver.restaurantId)?.name || 'عام'}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            driver.status === 'online' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : driver.status === 'busy'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {driver.status === 'online' ? 'متصل' : driver.status === 'busy' ? 'مشغول' : 'أوفلاين'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {driver.currentLocation && (
                              <button 
                                onClick={() => centerOnDriver(driver)}
                                title="تحديد الموقع على الخريطة"
                                className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                              >
                                <MapIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => openEditModal(driver)}
                              className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(driver.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>

        {/* إحصائيات سريعة */}
        <div className="space-y-6">
          <div className="futuristic-card bg-gradient-to-br from-blue-600/20 to-transparent border-blue-500/30">
            <h4 className="text-sm font-bold text-blue-400 mb-4">إحصائيات اليوم</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">إجمالي التوصيلات</span>
                <span className="text-white font-bold">124</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">متوسط وقت التوصيل</span>
                <span className="text-white font-bold">28 دقيقة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">أرباح التوصيل</span>
                <span className="text-emerald-400 font-bold">450,000 د.ع</span>
              </div>
            </div>
          </div>

          <div className="futuristic-card">
            <h4 className="text-sm font-bold text-white mb-4">أفضل المناديب أداءً</h4>
            <div className="space-y-4">
              {[
                { name: 'أحمد علي', orders: 24, rating: 4.9 },
                { name: 'محمد جاسم', orders: 21, rating: 4.8 },
                { name: 'سيف عادل', orders: 19, rating: 4.7 },
              ].map((top, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{top.name}</p>
                      <p className="text-[10px] text-slate-500">{top.orders} طلب</p>
                    </div>
                  </div>
                  <div className="text-amber-400 text-xs font-bold">★ {top.rating}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* نافذة إضافة مندوب */}
      <AnimatePresence>
        {showAddModal && (
          <Modal 
            title="إضافة مندوب جديد" 
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddDriver}
          >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اسم المندوب</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">رقم الهاتف العراقي</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                    placeholder="07XXXXXXXXX"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                  <input 
                    type="text" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                    placeholder="كلمة المرور"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">المطعم التابع (اختياري)</label>
                  <select 
                    value={formData.restaurantId}
                    onChange={e => setFormData({...formData, restaurantId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  >
                    <option value="">عام (لكل المطاعم)</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">العنوان</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  placeholder="عنوان السكن"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">رابط الصورة الشخصية</label>
                <input 
                  type="url" 
                  value={formData.photoURL}
                  onChange={e => setFormData({...formData, photoURL: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            <div className="flex gap-4 pt-6">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                إضافة المندوب
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">
                إلغاء
              </button>
            </div>
          </Modal>
        )}

        {/* نافذة تعديل مندوب */}
        {showEditModal && (
          <Modal 
            title="تعديل بيانات المندوب" 
            onClose={() => setShowEditModal(false)}
            onSubmit={handleEditDriver}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">اسم المندوب</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                  <input 
                    type="text" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">المطعم التابع</label>
                  <select 
                    value={formData.restaurantId}
                    onChange={e => setFormData({...formData, restaurantId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  >
                    <option value="">عام (لكل المطاعم)</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">العنوان</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">رابط الصورة الشخصية</label>
                <input 
                  type="url" 
                  value={formData.photoURL}
                  onChange={e => setFormData({...formData, photoURL: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
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
        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
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
