
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Send, Sparkles, Bot, Check, X } from 'lucide-react'
import './FamilyAI.css'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PendingAction = {
  type: 'task' | 'event'
  title: string
  description?: string
  assigned_to?: string
  due_at?: string
  priority?: string
  location?: string
  starts_at?: string
  ends_at?: string
}

export default function FamilyAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyKey, setHistoryKey] = useState('')
  useEffect(() => { let cancelled=false; async function loadHistory(){ const {data}=await supabase.auth.getUser(); if(!data.user)return; const key='fh-ai-history-'+data.user.id; setHistoryKey(key); try {const saved=JSON.parse(localStorage.getItem(key)||'[]'); if(!cancelled && Array.isArray(saved))setMessages(saved)}catch{}} loadHistory(); return ()=>{cancelled=true} },[])
  useEffect(() => { if(historyKey) localStorage.setItem(historyKey,JSON.stringify(messages)) },[messages,historyKey])
  function clearHistory(){ if(!confirm('Delete this Family AI conversation history?'))return; setMessages([]); if(historyKey)localStorage.removeItem(historyKey); setPendingAction(null) }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [saving, setSaving] = useState(false)

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()

    const text = input.trim()

    if (!text || loading || saving) return

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ]

    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError('')
    setPendingAction(null)

    const conversation = updatedMessages
      .map(item =>
        `${item.role === 'user' ? 'User' : 'Family AI'}: ${item.content}`
      )
      .join('\n\n')

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke('family-ai', {
          body: { message: conversation },
        })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: data.reply,
        },
      ])

      if (data?.action) {
        setPendingAction(data.action)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to Family AI.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function confirmAction() {
    if (!pendingAction || saving) return

    setSaving(true)
    setError('')

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke('family-ai', {
          body: {
            confirmAction: pendingAction,
          },
        })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: data.reply || 'Successfully saved!',
        },
      ])

      setPendingAction(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save the action.'
      )
    } finally {
      setSaving(false)
    }
  }

  function cancelAction() {
    setPendingAction(null)

    setMessages(current => [
      ...current,
      {
        role: 'assistant',
        content: 'No problem! I did not save anything.',
      },
    ])
  }

  return (
    <div className="family-ai-page">
      <header className="family-ai-header">
        <div className="family-ai-icon">
          <Sparkles size={22} />
        </div>

        <div>
          <h2>Family AI</h2>
          <p>Your family's intelligent assistant · conversation saved on this device</p>
        </div>
        <button type="button" className="family-ai-clear" onClick={clearHistory} title="Clear conversation">Clear</button>
      </header>

      <div className="family-ai-chat">
        {messages.length === 0 && (
          <div className="family-ai-welcome">
            <div className="family-ai-welcome-icon">
              <Bot size={38} />
            </div>

            <h3>How can I help?</h3>

            <p>
              Ask me questions, brainstorm ideas, plan activities,
              or help organize your day.
            </p>

            <div className="family-ai-suggestions">
              <button
                onClick={() =>
                  setInput('Help me plan a fun family weekend.')
                }
              >
                Plan a family weekend
              </button>

              <button
                onClick={() =>
                  setInput('Give me some ideas for family activities.')
                }
              >
                Family activity ideas
              </button>

              <button
                onClick={() =>
                  setInput('Help me organize my week.')
                }
              >
                Organize my week
              </button>
            </div>
          </div>
        )}

        {messages.map((item, index) => (
          <div
            key={index}
            className={`family-ai-message ${
              item.role === 'user'
                ? 'family-ai-user'
                : 'family-ai-assistant'
            }`}
          >
            {item.role === 'assistant' && (
              <div className="family-ai-message-icon">
                <Sparkles size={16} />
              </div>
            )}

            <div className="family-ai-bubble">
              {item.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="family-ai-message family-ai-assistant">
            <div className="family-ai-message-icon">
              <Sparkles size={16} />
            </div>

            <div className="family-ai-bubble family-ai-loading">
              Thinking...
            </div>
          </div>
        )}

        {pendingAction && (
          <div className="family-ai-confirmation">
            <h3>
              Confirm {pendingAction.type === 'task' ? 'Task' : 'Event'}
            </h3>

            <p><strong>{pendingAction.title}</strong></p>

            {pendingAction.description && (
              <p>{pendingAction.description}</p>
            )}

            {pendingAction.type === 'task' && (
              <>
                {pendingAction.assigned_to && (
                  <p>Assigned to: {pendingAction.assigned_to}</p>
                )}
                {pendingAction.due_at && (
                  <p>Due: {new Date(pendingAction.due_at).toLocaleString()}</p>
                )}
                {pendingAction.priority && (
                  <p>Priority: {pendingAction.priority}</p>
                )}
              </>
            )}

            {pendingAction.type === 'event' && (
              <>
                {pendingAction.starts_at && (
                  <p>Starts: {new Date(pendingAction.starts_at).toLocaleString()}</p>
                )}
                {pendingAction.ends_at && (
                  <p>Ends: {new Date(pendingAction.ends_at).toLocaleString()}</p>
                )}
                {pendingAction.location && (
                  <p>Location: {pendingAction.location}</p>
                )}
              </>
            )}

            <div className="family-ai-confirmation-buttons">
              <button
                onClick={confirmAction}
                disabled={saving}
              >
                <Check size={17} />
                {saving ? 'Saving...' : 'Confirm'}
              </button>

              <button
                onClick={cancelAction}
                disabled={saving}
              >
                <X size={17} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="family-ai-error">
          {error}
        </div>
      )}

      <form className="family-ai-composer" onSubmit={sendMessage}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Family AI..."
          disabled={loading || saving}
        />

        <button
          type="submit"
          disabled={!input.trim() || loading || saving}
          aria-label="Send message"
        >
          <Send size={19} />
        </button>
      </form>
    </div>
  )
}
