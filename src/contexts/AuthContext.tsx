import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { FREE_REPORT_LIMIT } from '../lib/planLimits'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  hasActiveSubscription: boolean
  freeReportsUsed: number
  freeReportsLeft: number
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  async function fetchProfile(userId: string) {
    const [profileRes, subRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('subscriptions').select('id').eq('user_id', userId).in('status', ['active', 'trialing']).maybeSingle(),
    ])
    if (profileRes.data) setProfile(profileRes.data as Profile)
    setHasActiveSubscription(!!subRes.data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    const currentUser = user
    if (!currentUser) return
    await fetchProfile(currentUser.id)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const freeReportsUsed = profile?.free_reports_used ?? 0
  const freeReportsLeft = Math.max(0, FREE_REPORT_LIMIT - freeReportsUsed)

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, hasActiveSubscription, freeReportsUsed, freeReportsLeft, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
