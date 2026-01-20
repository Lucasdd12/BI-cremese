'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { db } from '@/db'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const error = searchParams.get('error')
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const { user, isLoading: authLoading } = db.useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [justLoggedIn, setJustLoggedIn] = useState(false)

  useEffect(() => {
    // Only auto-redirect if user is authenticated AND we're not in the middle of a login flow
    if (user && !redirecting && !justLoggedIn && !codeSent) {
      setRedirecting(true)
      console.log('[Login] Usuário já autenticado, redirecionando...')
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.push(redirectTo)
      }, 100)
    }
  }, [user, redirectTo, router, redirecting, justLoggedIn, codeSent])

  useEffect(() => {
    if (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao fazer login. Tente novamente.',
      })
    }
  }, [error])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const normalizedEmail = email.toLowerCase().trim()
      
      // First, check if user exists in our database
      const checkRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      if (!checkRes.ok) {
        const errorData = await checkRes.json().catch(() => ({}))
        setMessage({
          type: 'error',
          text: errorData.message || 'Este email não está cadastrado. Entre em contato com o administrador.',
        })
        setLoading(false)
        return
      }

      // User exists, proceed to send magic code
      const result = await db.auth.sendMagicCode({ email: normalizedEmail })
      setCodeSent(true)
      setMessage({
        type: 'success',
        text: 'Código enviado para seu email! Verifique sua caixa de entrada.',
      })
      // In development, log the code if available
      if (process.env.NODE_ENV === 'development' && result?.code) {
        console.log('[DEV] Magic code:', result.code)
        setMessage({
          type: 'success',
          text: `Código enviado! (DEV: ${result.code})`,
        })
      }
    } catch (error: any) {
      console.error('Erro ao enviar código:', error)
      const errorMessage = error?.message || 'Erro ao enviar código. Verifique se o InstantDB está configurado corretamente.'
      setMessage({
        type: 'error',
        text: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      console.log('[Login] Verificando código para:', email.toLowerCase().trim())
      
      // Add timeout to prevent infinite loading (reduced to 5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('[Login] TIMEOUT após 5 segundos')
          reject(new Error('Timeout: A verificação está demorando muito. Verifique se o código está correto e tente novamente.'))
        }, 5000)
      })
      
      // Sign in with magic code with timeout
      console.log('[Login] Iniciando signInWithMagicCode...', {
        email: email.toLowerCase().trim(),
        codeLength: code.trim().length
      })
      
      const signInPromise = db.auth.signInWithMagicCode({
        email: email.toLowerCase().trim(),
        code: code.trim(),
      })
      
      console.log('[Login] Promise criada, aguardando...')
      
      // Race between sign in and timeout
      await Promise.race([signInPromise, timeoutPromise])
      
      console.log('[Login] signInWithMagicCode completou com sucesso')
      
      console.log('[Login] Login bem-sucedido')
      
      // Wait longer for InstantDB to set cookies and update auth state
      console.log('[Login] Aguardando cookies serem definidos...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Verify that user still exists in our database (double check)
      const normalizedEmail = email.toLowerCase().trim()
      const verifyRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      if (!verifyRes.ok) {
        // User doesn't exist - logout and show error
        console.error('[Login] Usuário não encontrado após login, fazendo logout')
        try {
          await db.auth.signOut()
        } catch (logoutError) {
          console.error('[Login] Erro ao fazer logout:', logoutError)
        }
        setMessage({
          type: 'error',
          text: 'Este email não está cadastrado. Entre em contato com o administrador.',
        })
        setLoading(false)
        setCodeSent(false)
        setCode('')
        return
      }

      // Mark that we just logged in to prevent useEffect from interfering
      setJustLoggedIn(true)
      
      // Use hard redirect to ensure navigation
      console.log('[Login] Redirecionando para:', redirectTo)
      // Ensure redirectTo is not empty or just '/'
      const finalRedirect = redirectTo && redirectTo !== '/' ? redirectTo : '/dashboard'
      window.location.href = finalRedirect
    } catch (error: any) {
      console.error('[Login] Erro ao verificar código:', error)
      setMessage({
        type: 'error',
        text: error?.message || 'Código inválido ou expirado. Tente solicitar um novo código.',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2c3f] to-[#0d7ba8] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BI Estratégico</h1>
          <p className="text-gray-600">Faça login para continuar</p>
        </div>

        {!codeSent ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition"
                  disabled={loading || authLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] hover:from-[#0d7ba8] hover:to-[#179dd4] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Enviar código de acesso
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Código de verificação
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="Digite o código recebido por email"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                disabled={loading || authLoading}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Verifique seu email e digite o código de 6 dígitos
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading || code.length !== 6}
              className="w-full bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] hover:from-[#0d7ba8] hover:to-[#179dd4] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar código'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCodeSent(false)
                setCode('')
                setMessage(null)
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              Voltar e usar outro email
            </button>
          </form>
        )}

        {message && (
          <div
            className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {codeSent
              ? 'Digite o código de 6 dígitos que foi enviado para seu email.'
              : 'Você receberá um código de 6 dígitos por email para fazer login.'}
          </p>
        </div>
      </div>
    </div>
  )
}
