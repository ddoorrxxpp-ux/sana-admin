import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Settings as SettingsIcon, Clock, Percent, 
  Monitor, QrCode, Printer, Mail, Save, 
  Shield, Bell, Globe, Database, Loader2, CheckCircle2,
  ExternalLink, Phone, Instagram, Youtube, Facebook,
  Image as ImageIcon, Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlatformSettings } from '../types';
import { logActivity } from '../utils/logger';
import { auth } from '../firebase';
import { useCamera } from '../components/CameraProvider';

/**
 * صفحة الإعدادات العامة - باللهجة العراقية والفصحى
 * تتيح التحكم في عمولة المنصة، الميزات المفعلة، وإعدادات النظام
 */
export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'منصة SaaS للمطاعم',
    platformLogo: '',
    platformIcon: '',
    restaurantPlatformName: 'لوحة تحكم المطعم',
    restaurantPlatformLogo: '',
    companyPhone: '',
    supportPhone: '',
    email: 'support@example.com',
    instagram: '',
    youtube: '',
    facebook: '',
    commissionEnabled: true,
  });

  const { captureSnapshot } = useCamera();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as PlatformSettings);
        }
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings');
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const snapshot = await captureSnapshot();
      await setDoc(doc(db, 'settings', 'global'), settings);
      
      // تسجيل النشاط
      if (auth.currentUser) {
        logActivity(
          auth.currentUser.uid,
          auth.currentUser.displayName || 'مدير النظام',
          'تحديث إعدادات المنصة',
          'تم تحديث الإعدادات العامة للمنصة',
          'update',
          snapshot
        );
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ enabled, onChange, label, icon: Icon }: any) => (
    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${enabled ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-bold text-slate-200">{label}</span>
      </div>
      <button 
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-all ${enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'right-7' : 'right-1'}`}></div>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">إعدادات المنصة ⚙️</h2>
          <p className="text-slate-400 mt-1">تحكم في هوية المنصة ومعلومات الاتصال</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'جاي نحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            تم حفظ إعدادات المنصة بنجاح!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* الهوية والشعارات */}
        <div className="space-y-6">
          <div className="futuristic-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              هوية المنصة
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">اسم المنصة (الرئيسي)</label>
                <div className="relative">
                  <Type className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={settings.platformName}
                    onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">رابط شعار المنصة (Login)</label>
                <input 
                  type="text" 
                  value={settings.platformLogo}
                  onChange={(e) => setSettings({...settings, platformLogo: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">اسم منصة المطاعم</label>
                <input 
                  type="text" 
                  value={settings.restaurantPlatformName}
                  onChange={(e) => setSettings({...settings, restaurantPlatformName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">رابط شعار منصة المطاعم</label>
                <input 
                  type="text" 
                  value={settings.restaurantPlatformLogo}
                  onChange={(e) => setSettings({...settings, restaurantPlatformLogo: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="futuristic-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-400" />
              معلومات الاتصال
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">هاتف الشركة</label>
                  <input 
                    type="text" 
                    value={settings.companyPhone}
                    onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">هاتف الدعم</label>
                  <input 
                    type="text" 
                    value={settings.supportPhone}
                    onChange={(e) => setSettings({...settings, supportPhone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">البريد الإلكتروني الرسمي</label>
                <input 
                  type="email" 
                  value={settings.email}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white text-left"
                />
              </div>
            </div>
          </div>
        </div>

        {/* التواصل الاجتماعي والعمولة */}
        <div className="space-y-6">
          <div className="futuristic-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" />
              روابط التواصل الاجتماعي
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Instagram
                </label>
                <input 
                  type="text" 
                  value={settings.instagram}
                  onChange={(e) => setSettings({...settings, instagram: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white text-left"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-500" />
                  YouTube
                </label>
                <input 
                  type="text" 
                  value={settings.youtube}
                  onChange={(e) => setSettings({...settings, youtube: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white text-left"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-blue-500" />
                  Facebook
                </label>
                <input 
                  type="text" 
                  value={settings.facebook}
                  onChange={(e) => setSettings({...settings, facebook: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white text-left"
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>
          </div>

          <div className="futuristic-card p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-400" />
              نظام العمولات
            </h3>
            <div className="space-y-4">
              <Toggle 
                enabled={settings.commissionEnabled} 
                onChange={(val: boolean) => setSettings({...settings, commissionEnabled: val})}
                label="تفعيل نظام العمولات العام"
                icon={Percent}
              />
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                عند تفعيل هذا الخيار، ستتمكن من تحديد عمولة لكل مطعم على حدة من قسم إدارة المطاعم. سيتم احتساب هذه العمولات وإضافتها إلى فاتورة الاشتراك.
              </p>
            </div>
          </div>

          <div className="futuristic-card p-8 border-red-500/20">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              إعدادات الأمان المتقدمة
            </h3>
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <p className="text-xs text-red-400 font-bold mb-2 uppercase tracking-wider">منطقة الخطر</p>
              <p className="text-sm text-slate-400 mb-4">تعطيل المنصة يمنع جميع المستخدمين والمطاعم من الوصول للنظام.</p>
              <button 
                className="w-full py-3 bg-red-600/10 text-red-400 border border-red-600/20 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all"
              >
                تعطيل المنصة مؤقتاً
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
