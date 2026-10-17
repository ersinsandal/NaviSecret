import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { LocationCore } from '@navisecret/sdk'
import { createNaviClient, NaviClient } from '@/services/NaviClient'

const SdkContext = createContext<NaviClient | null>(null)

export function SdkProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    return createNaviClient('/api/v1')
  }, [])

  return <SdkContext.Provider value={client}>{children}</SdkContext.Provider>
}

export function useSdk(): NaviClient {
  const ctx = useContext(SdkContext)
  if (!ctx) throw new Error('useSdk must be used within a SdkProvider')
  return ctx
}
