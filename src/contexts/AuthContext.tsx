
import React, { createContext, useState, useContext, useEffect } from "react";

interface AuthContextProps {
  user: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading auth state
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
