
import { useState } from 'react'
import { supabase } from './supabase'
import { Users } from 'lucide-react'

type Props = {
  onCreated: () => void
}

export default function FamilySetup({ onCreated }: Props) {
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createFamily(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.rpc('create_family', {
      p_name: familyName.trim(),
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    onCreated()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Users size={32} />
        </div>

        <h1>Create your family</h1>

        <p className="auth-subtitle">
          Give your family workspace a name. You can invite everyone else afterward.
        </p>

        <form onSubmit={createFamily}>
          <label>Family name</label>

          <input
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            placeholder="e.g. The Smith Family"
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Family'}
          </button>
        </form>
      </div>
    </div>
  )
}
