import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setUnauthorizedHandler } from './api';

interface AuthContextType {
  userId: string | null | undefined;
  setUserId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: undefined,
  setUserId: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setUnauthorizedHandler(() => setUserId(null));
    api.auth.getCurrentUser().then((user) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ userId, setUserId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
