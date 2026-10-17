/**
 * NaviSecret Authentication Context
 * Author & Creator: Ersin Sandal (SliferSoft)
 * Powered by NaviClient (Zero Supabase dependencies)
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useSdk } from '@/contexts/SdkContext'
import type { NaviUser } from '@/services/NaviClient'

export type User = NaviUser

interface AuthContextValue {
  user: NaviUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, extra?: { displayName?: string; username?: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const sdk = useSdk()
  const [user, setUser] = useState<NaviUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Register listener for auth state changes
    const {
      data: { subscription },
    } = sdk.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Check active session
    sdk.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => subscription.unsubscribe()
  }, [sdk])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await sdk.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) setUser(data.user)
    },
    [sdk],
  )

  const signUp = useCallback(
    async (email: string, password: string, extra?: { displayName?: string; username?: string }) => {
      const { data, error } = await sdk.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: extra?.displayName,
            username: extra?.username,
          },
        },
      })
      if (error) throw error
      if (data.user) setUser(data.user)
    },
    [sdk],
  )

  const signOut = useCallback(async () => {
    const { error } = await sdk.auth.signOut()
    setUser(null)
    if (error) throw error
  }, [sdk])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
