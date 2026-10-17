import { useState, useCallback } from 'react'
import { SdkProvider } from '@/contexts/SdkContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/i18n'
import AuthForm from '@/components/auth/AuthForm'
import AppShell from '@/components/layout/AppShell'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import ErrorBoundary from '@/components/ErrorBoundary'

function AppContent() {
  const { user, loading } = useAuth()
  const [onboarded, setOnboarded] = useState<boolean | null>(null)

  // Check onboarding status when user changes
  const isOnboarded = useCallback(() => {
    if (!user) return false
    return localStorage.getItem(`navisecret:onboarded:${user.id}`) === '1'
  }, [user])

  // Update onboarded state when user loads
  if (user && onboarded === null) {
    setOnboarded(isOnboarded())
  }
  if (!user && onboarded !== null) {
    setOnboarded(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F8FAFC] gap-3 select-none">
        <div className="w-8 h-8 rounded-full border-2 border-[#00B894] border-t-transparent animate-spin shadow-sm" />
        <span className="text-xs font-sans font-bold tracking-wider text-slate-600">
          Loading NaviSecret...
        </span>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  if (!onboarded) {
    return <OnboardingFlow onComplete={() => setOnboarded(true)} />
  }

  return <AppShell />
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <SdkProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SdkProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}
