import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id',
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

interface AuthContextType {
  user: FirebaseUser | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for demo mode persistence
    if (localStorage.getItem('burnex_demo_login') === 'true') {
      const mockUser = {
        uid: 'demo-user-123',
        email: 'demo@burnex.ai',
        displayName: 'Demo Athlete',
        photoURL: null,
        emailVerified: true,
        getIdToken: async () => 'mock-demo-token-123',
      } as unknown as FirebaseUser;
      
      setUser(mockUser);
      setToken('mock-demo-token-123');
      setLoading(false);
      return;
    }

    // Listen for auth state changes and ID token changes
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      // Only reset if we are not in mock demo mode
      if (token && token.startsWith('mock-demo-token')) {
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        const idToken = await currentUser.getIdToken(true);
        setToken(idToken);
        localStorage.setItem('token', idToken);
      } else {
        setToken(null);
        localStorage.removeItem('token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [token]);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async () => {
    setLoading(true);
    const mockUser = {
      uid: 'demo-user-123',
      email: 'demo@burnex.ai',
      displayName: 'Demo Athlete',
      photoURL: null,
      emailVerified: true,
      getIdToken: async () => 'mock-demo-token-123',
    } as unknown as FirebaseUser;

    setUser(mockUser);
    setToken('mock-demo-token-123');
    localStorage.setItem('token', 'mock-demo-token-123');
    localStorage.setItem('burnex_demo_login', 'true');
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Clear demo user local state
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('burnex_demo_login');
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGoogle,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
