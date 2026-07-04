/**
 * context/AuthContext.jsx
 * -----------------------
 * Authentication context provider.
 * Stub — login/logout/register logic will be wired up in a later iteration.
 */

import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

/**
 * useAuth — hook to consume the authentication context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider />')
  }
  return ctx
}

/**
 * AuthProvider — wraps the app and supplies auth state to all descendants.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('access_token'))

  /** Call this with the API response after a successful login. */
  const login = useCallback((userData, accessToken, refreshToken) => {
    setUser(userData)
    setToken(accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('access_token', accessToken)
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
  }, [])

  /** Clear all auth state. */
  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }, [])

  /** Register helper */
  const register = useCallback(async (name, email, password, role = 'staff') => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Registration failed');
    }
    return data;
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    register,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
