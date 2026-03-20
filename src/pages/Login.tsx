import React, { useState, useEffect, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Phone as PhoneIcon, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Smartphone, Hash } from 'lucide-react';
import { useCamera } from '../components/CameraProvider';
import { logActivity } from '../utils/logger';

/**
 * صفحة تسجيل الدخول - Sana Admin
 * تتضمن تسجيل الدخول برقم الهاتف للمستخدمين وبالإيميل للمدير
 */
export default function Login() {
  const { captureSnapshot } = useCamera();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (loginMethod === 'phone' && !recaptchaVerifier.current && recaptchaRef.current) {
      try {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
          size: 'invisible',
          callback: () => {
            console.log('Recaptcha resolved');
          }
        });
      } catch (err) {
        console.error('Recaptcha error:', err);
      }
    }
  }, [loginMethod]);

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const snapshot = await captureSnapshot();

      await logActivity(
        user.uid,
        user.email || 'غير معروف',
        'تسجيل دخول (إيميل)',
        'تم تسجيل الدخول بنجاح عبر البريد الإلكتروني',
        'login',
        snapshot
      );

      setSuccess('هلا بيك! جاي نحولك للوحة التحكم...');
    } catch (err: any) {
      let message = 'صار خطأ بتسجيل الدخول. تأكد من معلوماتك.';
      if (err.code === 'auth/user-not-found') message = 'هذا الحساب ما موجود عدنا.';
      if (err.code === 'auth/wrong-password') message = 'الباسورد غلط، ركز شوية!';
      if (err.code === 'auth/too-many-requests') message = 'حاولت هواي! الحساب انقفل مؤقتاً للحماية.';
      setError(message);
      
      const snapshot = await captureSnapshot();
      await logActivity('unknown', email, 'محاولة دخول فاشلة', `محاولة فاشلة للإيميل: ${email}`, 'login', snapshot);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('يرجى إدخال رقم الهاتف أولاً');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (!recaptchaVerifier.current) {
        throw new Error('Recaptcha not initialized');
      }
      
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+964${phoneNumber.replace(/^0/, '')}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
      setConfirmationResult(confirmation);
      setSuccess('تم إرسال رمز التأكيد إلى هاتفك');
    } catch (err: any) {
      console.error(err);
      setError('فشل إرسال الرمز. تأكد من رقم الهاتف.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // التحقق من وجود المستخدم في Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // إذا كان مستخدم جديد، يمكن توجيهه لإكمال البيانات أو إنشاء بروفايل افتراضي
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          phone: user.phoneNumber,
          role: 'user',
          status: 'active',
          createdAt: serverTimestamp()
        });
      }
      
      const snapshot = await captureSnapshot();
      await logActivity(
        user.uid,
        user.phoneNumber || 'مستخدم هاتف',
        'تسجيل دخول (هاتف)',
        'تم تسجيل الدخول بنجاح عبر رقم الهاتف',
        'login',
        snapshot
      );
      
      setSuccess('تم تسجيل الدخول بنجاح!');
    } catch (err: any) {
      setError('الرمز غير صحيح. حاول مرة ثانية.');
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
      <div id="recaptcha-container" ref={recaptchaRef}></div>
      
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
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Sana Admin</h1>
          <p className="text-slate-400">يا هلا بيك! سجل دخولك للمنصة</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl">
          {/* تبديل طريقة الدخول */}
          <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
            <button 
              onClick={() => { setLoginMethod('phone'); setError(''); setSuccess(''); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${loginMethod === 'phone' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Smartphone className="w-4 h-4" />
              رقم الهاتف
            </button>
            <button 
              onClick={() => { setLoginMethod('email'); setError(''); setSuccess(''); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Mail className="w-4 h-4" />
              البريد الإلكتروني
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm mb-6"
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
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-sm mb-6"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 mr-1">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sana.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-medium text-slate-400">كلمة المرور</label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">نسيت الباسورد؟</button>
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
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تسجيل الدخول'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {!confirmationResult ? (
                <form onSubmit={handleSendCode} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">رقم الهاتف</label>
                    <div className="relative">
                      <PhoneIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="tel" 
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="07XXXXXXXX"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white text-left"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mr-1">سيتم إرسال رمز تأكيد عبر SMS</p>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال الرمز'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 mr-1">رمز التأكيد</label>
                    <div className="relative">
                      <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="text" 
                        required
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="XXXXXX"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-blue-500/50 transition-all text-white tracking-[1em] text-center font-black"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الرمز والدخول'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors py-2"
                    >
                      تغيير رقم الهاتف
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* زر إنشاء حساب المدير */}
          {loginMethod === 'email' && email === "ddoorrxxpp@gmail.com" && (
            <button 
              type="button"
              onClick={bootstrapAdmin}
              disabled={isBootstrapping}
              className="w-full mt-6 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-bold py-3 rounded-2xl transition-all hover:bg-emerald-600/20 flex items-center justify-center gap-2 text-sm"
            >
              {isBootstrapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              إنشاء حساب مدير النظام (لأول مرة فقط)
            </button>
          )}
        </div>

        <p className="text-center mt-8 text-slate-500 text-sm">
          جميع الحقوق محفوظة لشركة سنة للبرمجة © 2026
        </p>
      </motion.div>
    </div>
  );
}
