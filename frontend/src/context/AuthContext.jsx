import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('fleet_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('fleet_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('fleet_token');
      if (storedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('fleet_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { access_token, user: loggedUser } = res.data;
    
    setToken(access_token);
    setUser(loggedUser);
    localStorage.setItem('fleet_token', access_token);
    localStorage.setItem('fleet_user', JSON.stringify(loggedUser));
    return loggedUser;
  };

  const register = async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    const { access_token, user: registeredUser } = res.data;
    
    setToken(access_token);
    setUser(registeredUser);
    localStorage.setItem('fleet_token', access_token);
    localStorage.setItem('fleet_user', JSON.stringify(registeredUser));
    return registeredUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fleet_token');
    localStorage.removeItem('fleet_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
