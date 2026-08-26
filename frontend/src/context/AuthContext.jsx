import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    setToken(data.access_token);
  };

  const register = async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    setToken(data.access_token);
  };

  const logout = () => {
    setToken(null);
  };

  // Helper function to make authenticated fetch calls
  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    if (!options.headers?.['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout(); // Auto logout on 401
      throw new Error('Session expired');
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}
