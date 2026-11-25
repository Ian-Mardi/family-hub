
import { useState } from 'react'
import { supabase } from './supabase'
import { Users } from 'lucide-react'

type Props = {
  onSaved: () => void
}

export default function MemberSetup({ onSaved }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setError('Please sign in again.')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('family_members')
      .update({ display_name: name.trim() })
      .eq('user_id', userData.user.id)

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    onSaved()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Users size={32} />
        </div>

        <h1>What should we call you?</h1>

        <p className="auth-subtitle">
          Choose the name your family will see in messages and other features.
        </p>

        <form onSubmit={saveName}>
          <label>Your name</label>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your first name"
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
