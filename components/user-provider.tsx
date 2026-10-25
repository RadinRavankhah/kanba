'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signToken, verifyToken, getTokenFromStorage, setTokenInStorage, removeTokenFromStorage, type AuthTokenPayload } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_status?: 'free' | 'pro' | null;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getTokenFromStorage();
        if (!token) {
          setLoading(false);
          return;
        }

        const payload = await verifyToken(token);
        if (payload) {
          setUser({
            id: payload.userId,
            email: payload.email,
          });
        } else {
          removeTokenFromStorage();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        removeTokenFromStorage();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback((token: string, userData: User) => {
    setTokenInStorage(token);
    setUser(userData);
  }, []);

  const signOut = useCallback(async () => {
    removeTokenFromStorage();
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, login, signOut, isAuthenticated: !!user }}>
      {children}
    </UserContext.Provider>
  );
}
