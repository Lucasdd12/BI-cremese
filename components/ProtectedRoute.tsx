'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { db } from '@/db'
import { Loader2 } from 'lucide-react'

type ProtectedRouteProps = {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, isAdmin } = useAuth()
  const { user: instantUser, isLoading: instantLoading } = db.useAuth()
  const router = useRouter()
  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    // Only redirect once
    if (redirected) return
    
    if (!instantLoading && !loading) {
      if (!instantUser) {
        setRedirected(true)
        router.push('/login')
      } else if (requireAdmin && !isAdmin && isAuthenticated) {
        setRedirected(true)
        router.push('/dashboard')
      }
    }
  }, [loading, instantLoading, instantUser, isAdmin, isAuthenticated, requireAdmin, router, redirected])

  // Show loading only if we're actually loading
  if (instantLoading || (loading && instantUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c2c3f] to-[#0d7ba8]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render (will redirect)
  if (!instantUser) {
    return null
  }

  // If requires admin but not admin
  if (requireAdmin && isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c2c3f] to-[#0d7ba8]">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Acesso Negado</p>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
