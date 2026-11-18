import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../api/client.js'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

function parseStoredUser() {
  try {
    const raw = localStorage.getItem('securedoc_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('securedoc_token'))
  const [user, setUser] = useState(parseStoredUser)

  const login = useCallback(async (username, password) => {
    const { data } = await authApi.login({ username, password })
    localStorage.setItem('securedoc_token', data.token)
    localStorage.setItem('securedoc_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('securedoc_token')
    localStorage.removeItem('securedoc_user')
    setToken(null)
    setUser(null)
    toast.success('Signed out successfully')
  }, [])

  // Sync user updates (e.g. after role change)
  const refreshUser = useCallback((updatedUser) => {
    const merged = { ...user, ...updatedUser }
    localStorage.setItem('securedoc_user', JSON.stringify(merged))
    setUser(merged)
  }, [user])

  const isAdmin = user?.role === 'ADMIN'
  const isInvestigator = user?.role === 'INVESTIGATOR'
  const isViewer = user?.role === 'VIEWER'
  const canWrite = isAdmin || isInvestigator

  return (
    <AuthContext.Provider value={{
      token, user, login, register, logout, refreshUser,
      isAdmin, isInvestigator, isViewer, canWrite
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
