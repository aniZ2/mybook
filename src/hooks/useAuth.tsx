// src/hooks/useAuth.tsx
"use client";

import * as React from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getAuthOrThrow } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const auth = getAuthOrThrow();
      
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error in AuthProvider:", error);
      setLoading(false);
    }
  }, []);

  const value = React.useMemo(() => ({ user, loading }), [user, loading]);

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}