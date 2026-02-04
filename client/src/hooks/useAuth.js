import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

const STORAGE_TOKEN_KEY = 'chat_app_token'
const STORAGE_USER_KEY = 'chat_app_user'

const readStored = (key) => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

const writeStored = (key, value) => {
  if (typeof window === 'undefined') return
  if (value == null) {
    window.localStorage.removeItem(key)
  } else {
    window.localStorage.setItem(key, value)
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => readStored(STORAGE_TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = readStored(STORAGE_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    writeStored(STORAGE_TOKEN_KEY, token || null)
  }, [token])

  useEffect(() => {
    writeStored(STORAGE_USER_KEY, user ? JSON.stringify(user) : null)
  }, [user])

  const login = useCallback(async (email, password) => {
    setStatus('loading')
    setError(null)
    try {
      const data = await api.login({ email, password })
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.message || 'Login failed')
      throw err
    } finally {
      setStatus('idle')
    }
  }, [])

  const register = useCallback(async (email, password) => {
    setStatus('loading')
    setError(null)
    try {
      const data = await api.register({ email, password })
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.message || 'Registration failed')
      throw err
    } finally {
      setStatus('idle')
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return {
    token,
    user,
    status,
    error,
    login,
    register,
    logout,
  }
}
