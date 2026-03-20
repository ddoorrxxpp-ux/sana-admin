import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Phone, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCamera } from '../components/CameraProvider';
import { logActivity } from '../utils/logger';

/**
 * صفحة تسجيل الدخول - باللهجة العراقية والفصحى
 * تتضمن حماية من المحاولات الخاطئة وتسجيل بيانات الجهاز والـ IP
 */
export default function Login() {
  const { captureSnapshot } = useCamera();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // وظيفة لإنشاء حساب المدير لأول مرة (Bootstrap)
  const bootstrapAdmin = async () => {
    setIsBootstrapping(true);
    setError('');
    setSuccess('');
    try {
      const adminEmail = "ddoorrxxpp@gmail.com";
      const adminPass = "2006114";
      
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      const user = userCredential.user;
      
      const adminData = {
        uid: user.uid,
        name: 'مدير النظام',
        email: adminEmail,
        role: 'super_admin',
        status: 'active',
        createdAt: serverTimestamp(),
        phone: '07000000000'
      };
      
      await setDoc(doc(db, 'users', user.uid), adminData);
      
      // تسجيل النشاط
      const snapshot = await captureSnapshot();
      await logActivity(
        user.uid,
        adminEmail,
        'إنشاء حساب مدير النظام',
        'تم إنشاء حساب مدير النظام لأول مرة بنجاح',
        'create',
        snapshot
      );

      setSuccess('تم إنشاء حساب مدير النظام بنجاح! تكدر هسه تسجل دخول.');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-complete' || err.code === 'auth/email-already-in-use') {
        setError('حساب المدير موجود أصلاً بالسيستم.');
      } else {
        setError('صار خطأ أثناء إنشاء الحساب: ' + err.message);
      }
    } finally {
      setIsBootstrapping(false);
    }
  };

  // جلب بيانات الجهاز والـ IP (محاكاة للـ IP لأننا في فرونت إند)
  const getClientInfo = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return {
        ip: data.ip,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
    } catch (e) {
      return {
        ip: 'unknown',
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. التحقق من عدد المحاولات (لو كان عندنا كولكشن للأدمنز)
      // ملاحظة: في العادة نستخدم Firebase Auth مباشرة، لكن هنا سنضيف سجل نشاط
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. التقاط صورة
      const snapshot = await captureSnapshot();

      // 3. تسجيل الدخول في سجل النشاطات
      await logActivity(
        user.uid,
        user.email || 'غير معروف',
        'تسجيل دخول',
        'تم تسجيل الدخول بنجاح إلى لوحة التحكم',
        'login',
        snapshot
      );

      setSuccess('هلا بيك! جاي نحولك للوحة التحكم...');
      // التوجيه يتم تلقائياً عبر App.tsx عند تغير حالة Auth
    } catch (err: any) {
      let message = 'صار خطأ بتسجيل الدخول. تأكد من معلوماتك.';
      if (err.code === 'auth/user-not-found') message = 'هذا الحساب ما موجود عدنا.';
      if (err.code === 'auth/wrong-password') message = 'الباسورد غلط، ركز شوية!';
      if (err.code === 'auth/too-many-requests') message = 'حاولت هواي! الحساب انقفل مؤقتاً للحماية.';
      
      setError(message);
      
      // تسجيل المحاولة الفاشلة
      const snapshot = await captureSnapshot();
      await logActivity(
        'unknown',
        email,
        'محاولة دخول فاشلة',
        `محاولة فاشلة للإيميل: ${email}`,
        'login',
        snapshot
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('اكتب إيميلك أول حتى نرسلك رابط التغيير.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('دزينا لك رابط تغيير الباسورد على إيميلك. شيكه!');
    } catch (err) {
      setError('ما كدرنا نرسل الرابط. تأكد من الإيميل.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* خلفية جمالية */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-400 p-5 mb-6 shadow-xl shadow-blue-500/20">
            <Lock className="w-full h-full text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">لوحة التحكم</h1>
          <p className="text-slate-400">يا هلا بيك! سجل دخولك حتى تدير المطاعم</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 mr-1">الإيميل أو التليفون</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  نسيت الباسورد؟
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-12 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <button 
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white/5 border-white/10'
                }`}
              >
                {rememberMe && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </button>
              <span className="text-sm text-slate-400 select-none cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                تذكرني على هذا الجهاز
              </span>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاي نسجل دخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>

            {/* زر إنشاء حساب المدير لأول مرة - يظهر فقط إذا كان الإيميل هو إيميل المدير */}
            {email === "ddoorrxxpp@gmail.com" && (
              <button 
                type="button"
                onClick={bootstrapAdmin}
                disabled={isBootstrapping}
                className="w-full mt-4 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-bold py-3 rounded-2xl transition-all hover:bg-emerald-600/20 flex items-center justify-center gap-2 text-sm"
              >
                {isBootstrapping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                إنشاء حساب مدير النظام (لأول مرة فقط)
              </button>
            )}
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 text-sm">
          جميع الحقوق محفوظة لمنصة SaaS لإدارة المطاعم © 2026
        </p>
      </motion.div>
    </div>
  );
}
