'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearStoredUser,
  getStoredUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
  storeUser,
  type LandingUser,
  type LoginInput,
  type SignupInput,
} from '../lib/auth';

type AuthContextValue = {
  user: LandingUser | null;
  isReady: boolean;
  isApproved: boolean;
  login: (input: LoginInput) => Promise<LandingUser>;
  signup: (input: SignupInput) => Promise<LandingUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LandingUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setIsReady(true);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const nextUser = await loginRequest(input);
    storeUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const nextUser = await signupRequest(input);
    storeUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearStoredUser();
      setUser(null);
    }
  }, []);

  const isApproved = user?.status === 'approved';

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady,
    isApproved,
    login,
    signup,
    logout,
  }), [isReady, isApproved, login, logout, signup, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
