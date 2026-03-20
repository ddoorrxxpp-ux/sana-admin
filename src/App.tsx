import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

// Pages (to be created)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Restaurants from './pages/Restaurants';
import ChainOwners from './pages/ChainOwners';
import Subscriptions from './pages/Subscriptions';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import Drivers from './pages/Drivers';
import Layout from './components/Layout';
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';
import { CameraProvider } from './components/CameraProvider';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
          } else {
            // If user exists in Auth but not in Firestore (e.g. first time)
            if (firebaseUser.email === "ddoorrxxpp@gmail.com") {
               const adminData: UserProfile = {
                 uid: firebaseUser.uid,
                 name: firebaseUser.displayName || 'مدير النظام',
                 email: firebaseUser.email,
                 role: 'super_admin',
                 status: 'active'
               };
               
               try {
                 // Create the document in Firestore so security rules can find it
                 await setDoc(doc(db, 'users', firebaseUser.uid), adminData);
                 setUser(adminData);
               } catch (error) {
                 console.error("Error creating admin profile:", error);
                 // Fallback to local state if Firestore write fails initially
                 setUser(adminData);
               }
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // If we can't fetch the profile, we might be stuck in a loop if we don't handle it
          // For now, just log it. If it's a permission error, it will be caught by the global handler if we add it.
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <GoogleMapsProvider>
      <CameraProvider>
        <Router>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            
            <Route element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/restaurants" element={<Restaurants />} />
              <Route path="/chain-owners" element={<ChainOwners />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/users" element={<Users />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/logs" element={<ActivityLogs />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </CameraProvider>
    </GoogleMapsProvider>
  );
}
