
import { useState } from 'react'
import { supabase } from './supabase'
import { MessageCircle } from 'lucide-react'
import './Auth.css'

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (result.error) {
      setError(result.error.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <MessageCircle size={32} />
        </div>

        <h1>Family Hub</h1>
        <p className="auth-subtitle">
          {isSignUp
            ? 'Create your family account'
            : 'Welcome back'}
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            minLength={6}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp
            ? 'Already have an account?'
            : "Don't have an account?"}
          {' '}
          <span onClick={() => {
            setIsSignUp(!isSignUp)
            setError('')
          }}>
            {isSignUp ? 'Sign In' : 'Create Account'}
          </span>
        </p>
      </div>
    </div>
  )
}
