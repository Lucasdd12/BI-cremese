'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/db'

export type User = {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff'
}

export function useAuth() {
  const { user: instantUser, isLoading: instantLoading } = db.useAuth()
  const [customUser, setCustomUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Only fetch if we have an instantUser and haven't fetched yet
    if (instantUser && instantUser.email && !fetching) {
      // Check if we already have a user with this email
      if (!customUser || customUser.email !== instantUser.email) {
        fetchCustomUser(instantUser.email)
      } else {
        setLoading(false)
      }
    } else if (!instantUser && !instantLoading) {
      setCustomUser(null)
      setLoading(false)
    } else if (instantLoading) {
      setLoading(true)
    }
  }, [instantUser?.email, instantLoading]) // Only depend on email to avoid loops

  const fetchCustomUser = async (email: string) => {
    if (fetching) return // Prevent multiple simultaneous fetches
    
    try {
      setFetching(true)
      setLoading(true)
      
      // Get token from InstantDB's localStorage
      // InstantDB stores tokens in localStorage - try multiple possible keys
      let authToken: string | null = null
      if (typeof window !== 'undefined') {
        const appId = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || '1ba42d05-90b9-4d1a-80c7-38e9cb8ce7d2'
        const possibleKeys = [
          `instant_auth_token_${appId}`,
          `instant-auth-token-${appId}`,
          'instant_auth_token',
          'instant-auth-token',
        ]
        for (const key of possibleKeys) {
          const token = localStorage.getItem(key)
          if (token) {
            authToken = token
            break
          }
        }
      }
      
      // Use the current-user endpoint which handles token verification
      // Send email as fallback if token not found
      const res = await fetch('/api/auth/current-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ email }),
      })
      
      if (res.status === 404) {
        // User doesn't exist in custom table - don't create automatically
        // User must be created by admin first
        console.warn('[useAuth] Usuário não encontrado na tabela customizada:', email)
        setCustomUser(null)
      } else if (res.ok) {
        const data = await res.json()
        setCustomUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
        })
      } else if (res.status === 401) {
        // Not authenticated
        setCustomUser(null)
      } else {
        // Other error - don't create user, just set to null
        console.error('[useAuth] Erro ao buscar usuário:', res.status)
        setCustomUser(null)
      }
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar usuário:', err)
      setError((err as Error).message)
      // Don't create user on error - user must be created by admin
      setCustomUser(null)
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  const logout = async () => {
    try {
      await db.auth.signOut()
      setCustomUser(null)
      router.push('/login')
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    }
  }

  return {
    user: customUser,
    instantUser,
    loading: loading || instantLoading,
    error,
    isAuthenticated: !!instantUser && !!customUser,
    isAdmin: customUser?.role === 'admin',
    isStaff: customUser?.role === 'staff',
    refetch: () => instantUser?.email && fetchCustomUser(instantUser.email),
    logout,
  }
}
