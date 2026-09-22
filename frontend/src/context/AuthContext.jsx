import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  axios.defaults.baseURL = "";

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("smartagri_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        try {
          const response = await axios.get("/api/auth/me");
          if (response.data && response.data.success) {
            setUser(response.data.data);
          } else {
            handleLogoutCleanups();
          }
        } catch {
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
    localStorage.removeItem("smartagri_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const storeSession = (token, userData) => {
    localStorage.setItem("smartagri_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(userData);
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      if (response.data && response.data.success) {
        const { token, user: userData } = response.data.data;
        storeSession(token, userData);
        return userData;
      }
      throw new Error(response.data?.error?.message || "Login failed.");
    } catch (error) {
      throw new Error(
        error.response?.data?.error?.message || error.message || "Server connection failed."
      );
    }
  };

  /**
   * Register a new user / organization.
   * - New org code  → org created, user assigned OWNER automatically (backend rule).
   * - Existing org  → user created with chosen roleName inside that org.
   */
  const register = async ({ name, email, password, roleName, organizationCode, organizationName }) => {
    try {
      const response = await axios.post("/api/auth/register", {
        name, email, password, roleName, organizationCode, organizationName,
      });
      if (response.data && response.data.success) {
        const { token, user: userData } = response.data.data;
        storeSession(token, userData);
        return userData;
      }
      throw new Error(response.data?.error?.message || "Registration failed.");
    } catch (error) {
      throw new Error(
        error.response?.data?.error?.message || error.message || "Server connection failed."
      );
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // best-effort
    } finally {
      handleLogoutCleanups();
    }
  };

  const hasPermission = (permission) =>
    !!(user?.permissions?.includes(permission));

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
