import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityLog } from '../types';

/**
 * وظيفة لتسجيل النشاطات في السيستم
 * @param userId - معرف المستخدم اللي سوى الحركة
 * @param userName - اسم المستخدم
 * @param action - نوع الحركة (مثلاً: إضافة مطعم)
 * @param details - تفاصيل إضافية
 * @param type - نوع العملية (create, update, delete, login)
 * @param snapshotUrl - رابط الصورة إذا كان العمل حساس
 */
export const logActivity = async (
  userId: string,
  userName: string,
  action: string,
  details: string,
  type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other' = 'other',
  snapshotUrl?: string | null
) => {
  try {
    const logData: any = {
      userId,
      userName,
      action,
      details,
      timestamp: serverTimestamp(),
      type,
      ip: '127.0.0.1', // في الواقع نأخذ الـ IP من السيرفر
      device: navigator.userAgent
    };

    if (snapshotUrl !== undefined && snapshotUrl !== null) {
      logData.snapshotUrl = snapshotUrl;
    }

    // التأكد من عدم وجود أي قيم undefined في الكائن
    const cleanLogData = Object.fromEntries(
      Object.entries(logData).filter(([_, v]) => v !== undefined)
    );

    await addDoc(collection(db, 'activity_logs'), cleanLogData);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
