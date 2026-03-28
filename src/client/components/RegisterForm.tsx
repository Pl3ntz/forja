import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { authClient } from '@/lib/auth-client.js'
import { useAuth } from '../hooks/useAuth.js'
import GoogleSignInButton from './GoogleSignInButton.js'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message ?? 'Falha no cadastro')
        setLoading(false)
        return
      }

      await refresh()
      navigate('/dashboard')
    } catch {
      setError('Ocorreu um erro inesperado')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-[fadeIn_0.3s_ease]">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Cadastrar</h1>
      <p className="text-text-secondary text-sm mb-6">Crie sua conta Forja</p>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-error/10 border border-error/30 text-error rounded-lg p-3 mb-4 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1.5">Nome</label>
        <input
          id="name"
          type="text"
          className="w-full px-3.5 py-3 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">E-mail</label>
        <input
          id="email"
          type="email"
          className="w-full px-3.5 py-3 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="mb-5">
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">Senha</label>
        <input
          id="password"
          type="password"
          className="w-full px-3.5 py-3 bg-forge-750 border border-forge-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20 focus:outline-none transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-ember-500 text-white font-semibold rounded-lg hover:bg-ember-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-ember-500/20 text-sm"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Criando conta...
          </span>
        ) : 'Criar conta'}
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-forge-600" />
        <span className="text-text-muted text-xs">ou</span>
        <div className="flex-1 h-px bg-forge-600" />
      </div>

      <GoogleSignInButton />

      <p className="mt-4 text-center text-sm text-text-secondary">
        Já tem uma conta?{' '}
        <a href="/auth/login" className="text-molten-500 hover:text-molten-400 transition-colors font-medium">Entrar</a>
      </p>
    </form>
  )
}
