import { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth.js'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('sentinel_token')
    const storedUser = localStorage.getItem('sentinel_user')
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem('sentinel_token')
        localStorage.removeItem('sentinel_user')
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password })
      const { token: newToken, user: newUser } = response
      
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('sentinel_token', newToken)
      localStorage.setItem('sentinel_user', JSON.stringify(newUser))
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed. Please check your credentials.' 
      }
    }
  }

  const register = async (email, password, confirmPassword) => {
    if (password !== confirmPassword) {
      return { 
        success: false, 
        error: 'Passwords do not match.' 
      }
    }
    
    if (password.length < 8) {
      return { 
        success: false, 
        error: 'Password must be at least 8 characters long.' 
      }
    }

    try {
      const response = await authApi.register({ email, password, confirmPassword })
      const { token: newToken, user: newUser } = response
      
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('sentinel_token', newToken)
      localStorage.setItem('sentinel_user', JSON.stringify(newUser))
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Registration failed. Please try again.' 
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('sentinel_token')
    localStorage.removeItem('sentinel_user')
  }

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}