
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { Send, Users, ArrowLeft, Plus, MessageCircle, Image as ImageIcon, Search } from 'lucide-react'
import './Messaging.css'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

type Conversation = {
  id: string
  name: string
  is_group: boolean
  otherUserId?: string
}

type FamilyMember = {
  user_id: string
  display_name: string
}

export default function Messaging() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({})
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [showConversationList, setShowConversationList] = useState(true)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [photoUrls,setPhotoUrls]=useState<Record<string,string>>({})
  const [searchTerm,setSearchTerm]=useState('')
  const [searchOpen,setSearchOpen]=useState(false)
  const [listFilter,setListFilter]=useState<'all'|'groups'|'people'>('all')
  const [showStartModal,setShowStartModal]=useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function setupMessaging() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        if (!cancelled) {
          setError('Please sign in again.')
          setLoading(false)
        }
        return
      }

      const currentUserId = userData.user.id

      if (!cancelled) {
        setUserId(currentUserId)
      }

      const { data: membership, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', currentUserId)
        .limit(1)
        .single()

      if (memberError || !membership) {
        if (!cancelled) {
          setError(memberError?.message || 'Family membership not found.')
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setFamilyId(membership.family_id)
      }

      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select('user_id, display_name')
        .eq('family_id', membership.family_id)

      if (membersError) {
        if (!cancelled) {
          setError(membersError.message)
          setLoading(false)
        }
        return
      }

      const names: Record<string, string> = {}

      ;(members || []).forEach(member => {
        names[member.user_id] = member.display_name || 'Family member'
      })

      if (!cancelled) {
        setMemberNames(names)
        setFamilyMembers(members || [])
      }

      const { data: groupId, error: groupError } = await supabase.rpc(
        'ensure_family_group'
      )

      if (groupError || !groupId) {
        if (!cancelled) {
          setError(groupError?.message || 'Could not open family chat.')
          setLoading(false)
        }
        return
      }

      const { data: conversationData, error: conversationError } =
        await supabase
          .from('conversations')
          .select('id, name, is_group')
          .eq('family_id', membership.family_id)

      if (conversationError) {
        if (!cancelled) {
          setError(conversationError.message)
          setLoading(false)
        }
        return
      }

      const conversationIds = (conversationData || []).map(item => item.id)

      const { data: participantData, error: participantError } =
        await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', conversationIds)

      if (participantError) {
        if (!cancelled) {
          setError(participantError.message)
          setLoading(false)
        }
        return
      }

      const loadedConversations: Conversation[] = (
        conversationData || []
      ).map(item => {
        const participants = (participantData || []).filter(
          person => person.conversation_id === item.id
        )

        const otherPerson = participants.find(
          person => person.user_id !== currentUserId
        )

        return {
          id: item.id,
          name: item.is_group
            ? item.name
            : names[otherPerson?.user_id || ''] || 'Family member',
          is_group: item.is_group,
          otherUserId: otherPerson?.user_id,
        }
      })

      const { data: latestMessages, error: latestMessagesError } =
  await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

if (latestMessagesError) {
  if (!cancelled) {
    setError(latestMessagesError.message)
  }
} else {
  const previews: Record<string, Message> = {}

  ;(latestMessages || []).forEach(item => {
    if (!previews[item.conversation_id]) {
      previews[item.conversation_id] = {
        id: item.id,
        sender_id: item.sender_id,
        content: item.content,
        created_at: item.created_at,
      }
    }
  })

  if (!cancelled) {
    setLastMessages(previews)
  }
}

      if (!cancelled) {
        setConversations(loadedConversations)

        const groupConversation = loadedConversations.find(
          item => item.id === groupId
        )

        if (groupConversation) {
          setActiveConversation(groupConversation)
          setShowConversationList(false)
        }

        setLoading(false)
      }
    }

    setupMessaging()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeConversation) return

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function loadConversationMessages() {
      setLoading(true)
      setError('')

      const { data, error: messageError } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('conversation_id', activeConversation!.id)
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (messageError) {
        setError(messageError.message)
        setLoading(false)
        return
      }

      setMessages(data || [])
      setLoading(false)

      channel = supabase
        .channel(`messages-${activeConversation!.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConversation!.id}`,
          },
          payload => {
            const newMessage = payload.new as Message

            setMessages(current => {
              if (current.some(item => item.id === newMessage.id)) {
                return current
              }

              return [...current, newMessage]
            })
          }
        )
        .subscribe()
    }

    loadConversationMessages()

    return () => {
      cancelled = true

      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [activeConversation])

  useEffect(()=>{
    async function resolvePhotos(){const paths=messages.map(m=>m.content.startsWith('PHOTO::')?m.content.slice(7):'').filter(Boolean);const result:Record<string,string>={};for(const path of paths){const {data}=await supabase.storage.from('family-gallery').createSignedUrl(path,3600);if(data?.signedUrl)result[path]=data.signedUrl}setPhotoUrls(result)}resolvePhotos()
  },[messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()

    const content = message.trim()

    if (!content || !activeConversation || sending) return

    setSending(true)
    setError('')

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversation.id,
        sender_id: userId,
        content,
      })
      .select('id, sender_id, content, created_at')
      .single()

    setSending(false)

    if (sendError) {
      setError(sendError.message)
      return
    }

    if (data) {
      setMessages(current => {
        if (current.some(item => item.id === data.id)) {
          return current
        }

        return [...current, data]
      })
    }

    setMessage('')
  }

  async function sendPhoto(file:File){
    if(!activeConversation||!userId||!file.type.startsWith('image/'))return
    setSending(true);setError('')
    const path=`${familyId}/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const {error:uploadError}=await supabase.storage.from('family-gallery').upload(path,file)
    if(uploadError){setError(uploadError.message);setSending(false);return}
    const {data:msg,error:msgError}=await supabase.from('messages').insert({conversation_id:activeConversation.id,sender_id:userId,content:`PHOTO::${path}`}).select('id,sender_id,content,created_at').single()
    if(msgError){setError(msgError.message);setSending(false);return}
    if(activeConversation.is_group){const {error:galleryError}=await supabase.from('family_gallery_media').insert({family_id:familyId,conversation_id:activeConversation.id,message_id:msg.id,uploader_id:userId,storage_path:path,caption:file.name});if(galleryError)setError('Photo sent to chat. Gallery setup is still pending: '+galleryError.message)}
    setMessages(current=>[...current,msg]);setSending(false)
  }

  async function startConversation(member: FamilyMember) {
    if (!userId || !familyId || creatingConversation) return
    if (member.user_id === userId) return

    const existingConversation = conversations.find(
      conversation =>
        !conversation.is_group &&
        conversation.otherUserId === member.user_id
    )

    if (existingConversation) {
      setActiveConversation(existingConversation)
      setShowConversationList(false)
      return
    }

    setCreatingConversation(true)
    setError('')

    const { data: conversationId, error: createError } = await supabase.rpc(
      'create_conversation',
      {
        p_family_id: familyId,
        p_name: member.display_name || 'Private conversation',
        p_is_group: false,
        p_participant_ids: [userId, member.user_id],
      }
    )

    setCreatingConversation(false)

    if (createError || !conversationId) {
      setError(createError?.message || 'Could not create conversation.')
      return
    }

    const newConversation: Conversation = {
      id: conversationId,
      name: member.display_name || 'Family member',
      is_group: false,
      otherUserId: member.user_id,
    }

    setConversations(current => [...current, newConversation])
    setActiveConversation(newConversation)
    setShowConversationList(false)
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getConversationPreview(conversationId: string) {
  const latest = lastMessages[conversationId]

  if (!latest) {
    return 'No messages yet'
  }

  return latest.sender_id === userId
    ? `You: ${latest.content}`
    : `${memberNames[latest.sender_id] || 'Family member'}: ${latest.content}`
}

  if (loading && !activeConversation && conversations.length === 0) {
    return (
      <div className="messaging-page">
        <p className="message-status">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="messaging-page">
      {showStartModal&&<div className="start-chat-overlay"><div className="start-chat-modal"><div className="start-chat-head"><strong>New conversation</strong><button onClick={()=>setShowStartModal(false)} aria-label="Close">×</button></div>{familyMembers.filter(m=>m.user_id!==userId).map(m=><button className="start-chat-member" key={m.user_id} onClick={()=>{setShowStartModal(false);startConversation(m)}}><span className="messaging-avatar"><MessageCircle size={20}/></span><span>{m.display_name||'Family member'}</span></button>)}{familyMembers.filter(m=>m.user_id!==userId).length===0&&<p>No other family members found.</p>}</div></div>}
      {showConversationList ? (
        <>
          <header className="messaging-list-header">
            <div className="messaging-brand"><div className="messaging-avatar"><MessageCircle size={21} /></div><span>Family Hub</span><button className="new-chat-action" aria-label="Start conversation" onClick={()=>setShowStartModal(true)}><Plus size={21}/></button></div>
            <h1>Messages</h1>
            <div className="conversation-search"><Search size={18}/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search family conversations..."/></div>
            <div className="conversation-filters">{(['all','groups','people'] as const).map(f=><button key={f} className={listFilter===f?'active':''} onClick={()=>setListFilter(f)}>{f==='all'?'All':f==='groups'?'Groups':'People'}</button>)}</div>
          </header>

          <div className="message-list conversation-scroll">
            {listFilter!=='people' && (!searchTerm.trim() || 'family group'.includes(searchTerm.toLowerCase())) && <button
              className="conversation-list-item family-conversation"
              onClick={() => {
                const group = conversations.find(item => item.is_group)
                if (group) {
                  setActiveConversation(group)
                  setShowConversationList(false)
                }
              }}
            >
              <div className="messaging-avatar">
                <Users size={22} />
              </div>

              <div className="conversation-list-details">
  <strong>Family Group</strong>
  <span>{getConversationPreview(
    conversations.find(item => item.is_group)?.id || ''
  )}</span>
  {lastMessages[conversations.find(item => item.is_group)?.id || ''] && (
    <small>
      {formatTime(
        lastMessages[conversations.find(item => item.is_group)?.id || ''].created_at
      )}
    </small>
  )}
</div>
            </button>}

            <div className="conversation-section-heading">
              <h3>Direct messages</h3>
            </div>

            {conversations
              .filter(item => !item.is_group && listFilter!=='groups' && (!searchTerm.trim() || item.name.toLowerCase().includes(searchTerm.toLowerCase())))
              .map(item => (
                <button
                  className="conversation-list-item"
                  key={item.id}
                  onClick={() => {
                    setActiveConversation(item)
                    setShowConversationList(false)
                  }}
                >
                  <div className="messaging-avatar">
                    <MessageCircle size={22} />
                  </div>

                  <div className="conversation-list-details">
  <strong>{item.name}</strong>
  <span>{getConversationPreview(item.id)}</span>
  {lastMessages[item.id] && (
    <small>{formatTime(lastMessages[item.id].created_at)}</small>
  )}
</div>
                </button>
              ))}

            <div className="conversation-section-heading">
              <h3>Family members</h3>
            </div>

            {listFilter==='all' && familyMembers
              .filter(member => member.user_id !== userId)
              .map(member => (
                <button
                  className="conversation-list-item"
                  key={member.user_id}
                  onClick={() => startConversation(member)}
                  disabled={creatingConversation}
                >
                  <div className="messaging-avatar">
                    <Plus size={22} />
                  </div>

                  <div className="conversation-list-details">
                    <strong>{member.display_name || 'Family member'}</strong>
                    <span>Start a private conversation</span>
                  </div>
                </button>
              ))}

            {creatingConversation && (
              <p className="message-status">Creating conversation...</p>
            )}
          </div>
        </>
      ) : (
        <>
          <header className="messaging-header">
            <button
              className="conversation-back-button"
              onClick={() => setShowConversationList(true)}
              aria-label="Back to conversations"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="messaging-avatar chat-avatar">
              {activeConversation?.is_group ? <Users size={22} /> : <MessageCircle size={22} />}
            </div>

            <div className="chat-title-block">
              <h2>
                {activeConversation?.is_group
                  ? 'Family Group'
                  : activeConversation?.name}
              </h2>
              <p>
                {activeConversation?.is_group
                  ? 'Your family conversation'
                  : 'Private conversation'}
              </p>
            </div>
          </header>

          {searchOpen&&<input className="message-search" placeholder="Search this conversation" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>}
          <div className="message-list">
            {loading && (
              <p className="message-status">Loading messages...</p>
            )}

            {!loading && messages.length === 0 && (
              <div className="message-empty">
                <Users size={32} />
                <h3>Start the conversation</h3>
                <p>Send the first message!</p>
              </div>
            )}

            {messages.filter(item=>!searchTerm.trim()||item.content.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
              const isMine = item.sender_id === userId

              return (
                <div
                  className={`message-item ${
                    isMine ? 'message-mine' : 'message-theirs'
                  }`}
                  key={item.id}
                >
                  {!isMine && (
                    <span className="message-sender">
                      {memberNames[item.sender_id] || 'Family member'}
                    </span>
                  )}

                  <div className="message-bubble">
                    {item.content.startsWith('PHOTO::')? (photoUrls[item.content.slice(7)]?<img className="chat-photo" src={photoUrls[item.content.slice(7)]} alt="Shared family photo"/>:<span>Loading photo…</span>):item.content}
                  </div>

                  <span className="message-time">
                    {formatTime(item.created_at)}
                  </span>
                </div>
              )
            })}

            <div ref={bottomRef} />
          </div>

          {error && <p className="message-error">{error}</p>}

          <form className="message-composer" onSubmit={sendMessage}>
            <label className="photo-attach" aria-label="Attach photo"><ImageIcon size={20}/><input type="file" accept="image/*" onChange={e=>{if(e.target.files?.[0])sendPhoto(e.target.files[0]);e.currentTarget.value=''}}/></label>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write a message..."
              disabled={loading || !activeConversation || sending}
            />

            <button
              type="submit"
              disabled={!message.trim() || loading || sending}
              aria-label="Send message"
            >
              <Send size={19} />
            </button>
          </form>
        </>
      )}

      {error && showConversationList && (
        <p className="message-error">{error}</p>
      )}
    </div>
  )
}
