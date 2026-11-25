
import { useState } from 'react'
import { supabase } from './supabase'
import { Users, Copy, Check } from 'lucide-react'

export default function InviteMembers() {
  const [email, setEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function createInvitation(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInviteLink('')
    setCopied(false)

    const { data, error } = await supabase.rpc(
      'create_family_invitation',
      { p_email: email.trim() }
    )

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setInviteLink(
      `${window.location.origin}/?invite=${data}`
    )
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
    } catch {
      setError('Could not copy automatically. Select and copy the link instead.')
    }
  }

  return (
    <div className="full-page">
      <header className="page-header">
        <div>
          <p className="section-kicker">GROW YOUR FAMILY SPACE</p>
          <h1>Invite Family</h1>
        </div>
        <Users size={27} />
      </header>

      <div className="placeholder-card">
        <h3>Bring everyone together</h3>
        <p>
          Invite a family member using their email address.
          Invitations expire after seven days.
        </p>

        <form onSubmit={createInvitation}>
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="family@example.com"
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating invitation...' : 'Create invitation'}
          </button>
        </form>

        {inviteLink && (
          <div style={{ marginTop: 24 }}>
            <p><strong>Invitation link created!</strong></p>
            <input
              value={inviteLink}
              readOnly
              onFocus={e => e.target.select()}
            />
            <button type="button" onClick={copyLink}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? 'Copied!' : 'Copy invitation link'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
