import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiLogin, apiLogout, apiMe, apiSignup, type User } from './api.ts'

type AuthState = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (b: { first_name: string; last_name: string; email: string; password: string }) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    apiMe()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiLogin(email, password)
    setUser(r.user)
    return r.user as User
  }, [])

  const signup = useCallback(async (b: Parameters<AuthState['signup']>[0]) => {
    const r = await apiSignup(b)
    setUser(r.user)
    return r.user as User
  }, [])

  const logout = useCallback(async () => {
    await apiLogout().catch(() => undefined)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, ready, login, signup, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
