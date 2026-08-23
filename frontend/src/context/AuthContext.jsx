import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set default baseURL if not already set (relying on vite proxy)
  axios.defaults.baseURL = '';

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('smartagri_token');
      if (token) {
        // Set authorization header globally for all axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axios.get('/api/auth/me');
          if (response.data && response.data.success) {
            setUser(response.data.data);
          } else {
            // If response succeeded but format was invalid, logout
            handleLogoutCleanups();
          }
        } catch (error) {
          console.error('Session validation failed:', error);
          // Token is likely expired or invalid
          handleLogoutCleanups();
        }
      } else {
        handleLogoutCleanups();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogoutCleanups = () => {
    localStorage.removeItem('smartagri_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.data && response.data.success) {
        const { token, user: userData } = response.data.data;
        localStorage.setItem('smartagri_token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
      } else {
        throw new Error(response.data?.error?.message || 'Login failed.');
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Server connection failed.';
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      // Best effort backend logout call
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.warn('Backend logout warning:', error);
    } finally {
      handleLogoutCleanups();
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
