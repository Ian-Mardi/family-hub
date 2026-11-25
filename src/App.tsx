import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import {
  Home,
  MessageCircle,
  CalendarDays,
  CheckSquare,
  MoreHorizontal,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  X,
  Check,
  Bell,
  Plus,
  Image,
  Sparkles,
} from 'lucide-react'

import './App.css'

import { supabase } from './supabase'
import Auth from './Auth'
import FamilySetup from './FamilySetup'
import MemberSetup from './MemberSetup'
import InviteMembers from './InviteMembers'
import Messaging from './Messaging'
import FamilyAI from './FamilyAI'
import PublicPage from './PublicPage'
import Gallery from './Gallery'

type Tab = 'Home' | 'Messages' | 'Calendar' | 'Family AI' | 'More'

type FamilyTask = {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  due_at: string | null
  priority: string
  completed_at: string | null
  recurrence: string | null
}

type FamilyEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
}

// MAIN DASHBOARD

function Dashboard() {
  const [familyName, setFamilyName] = useState('Family Hub')
  const [memberName, setMemberName] = useState('You')
  const [showInvites, setShowInvites] = useState(false)

  const [familyId, setFamilyId] = useState('')
  const [accent, setAccent] = useState(() => localStorage.getItem('fh-accent') || '#007aff')
  const [appearance, setAppearance] = useState(() => localStorage.getItem('fh-appearance') || 'system')
  const [homeWidgets, setHomeWidgets] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('fh-widgets') || '[\"calendar\",\"messages\",\"tasks\",\"polls\",\"ai\"]') } catch { return ['calendar','messages','tasks','polls','ai'] } })
  const [moreSection, setMoreSection] = useState('')
  const [groupPreview,setGroupPreview]=useState<{content:string;created_at:string;sender_id:string}|null>(null)
  const [polls,setPolls]=useState<any[]>([])
  const [pollLoading,setPollLoading]=useState(false)
  const [showPollForm,setShowPollForm]=useState(false)
  const [editingPollId,setEditingPollId]=useState<string|null>(null)
  const [pollTitle,setPollTitle]=useState('')
  const [pollOptions,setPollOptions]=useState('')
  const [pollPopup,setPollPopup]=useState<any|null>(null)
  const [pollVote,setPollVote]=useState('')
  const [tasks, setTasks] = useState<FamilyTask[]>([])
  const [taskMembers, setTaskMembers] = useState<Record<string, string>>({})
  const [tasksLoading, setTasksLoading] = useState(false)
  const [updatingTask, setUpdatingTask] = useState('')
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([])
const [eventsLoading, setEventsLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<Tab>(() => {
  const savedTab = localStorage.getItem('family-hub-active-tab')
  const tabs: Tab[] = ['Home', 'Messages', 'Calendar', 'Family AI', 'More']

  if (savedTab && tabs.includes(savedTab as Tab)) {
    return savedTab as Tab
  }

  return 'Home'
})

const [showRequest, setShowRequest] = useState(
  () => localStorage.getItem('family-hub-show-request') !== 'false'
)

const [requestAnswered, setRequestAnswered] = useState(
  () => localStorage.getItem('family-hub-request-answered') === 'true'
)

const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date().toISOString().slice(0, 10))
const [showEventForm, setShowEventForm] = useState(false)
const [eventTitle, setEventTitle] = useState('')
const [eventDescription, setEventDescription] = useState('')
const [eventLocation, setEventLocation] = useState('')
const [eventStart, setEventStart] = useState('')
const [eventEnd, setEventEnd] = useState('')
const [savingEvent, setSavingEvent] = useState(false)
const [eventError, setEventError] = useState('')

// SAVE APP STATE

useEffect(() => {
  localStorage.setItem('family-hub-active-tab', activeTab)
}, [activeTab])

useEffect(() => { localStorage.setItem('fh-accent', accent) }, [accent])
useEffect(() => { localStorage.setItem('fh-appearance', appearance) }, [appearance])
useEffect(() => { localStorage.setItem('fh-widgets', JSON.stringify(homeWidgets)) }, [homeWidgets])

useEffect(() => {
  localStorage.setItem('family-hub-show-request', String(showRequest))
}, [showRequest])

useEffect(() => {
  localStorage.setItem('family-hub-request-answered', String(requestAnswered))
}, [requestAnswered])

  // LOAD FAMILY INFORMATION

  useEffect(() => {
    let cancelled = false

    async function loadFamilyInformation() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) return

      const { data: membership, error } = await supabase
        .from('family_members')
        .select('family_id, display_name')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()

      if (error || !membership) return
      if (cancelled) return

      setFamilyId(membership.family_id)

      if (membership.display_name) {
        setMemberName(membership.display_name)
      }

      const { data: family } = await supabase
        .from('families')
        .select('name')
        .eq('id', membership.family_id)
        .single()

      if (family && !cancelled) {
        setFamilyName(family.name)
      }
    }

    loadFamilyInformation()

    return () => {
      cancelled = true
    }
  }, [])

  // LOAD FAMILY GROUP CHAT PREVIEW AND LIVE UPDATES
  useEffect(()=>{if(!familyId)return; let cancelled=false; let channel:any=null; async function loadPreview(){const {data:gid,error}=await supabase.rpc('ensure_family_group'); if(error||!gid)return; const {data}=await supabase.from('messages').select('sender_id,content,created_at').eq('conversation_id',gid).order('created_at',{ascending:false}).limit(1); if(!cancelled)setGroupPreview(data?.[0]||null); channel=supabase.channel('home-group-preview-'+gid).on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'conversation_id=eq.'+gid},()=>{supabase.from('messages').select('sender_id,content,created_at').eq('conversation_id',gid).order('created_at',{ascending:false}).limit(1).then(({data})=>{if(!cancelled)setGroupPreview(data?.[0]||null)})}).subscribe()} loadPreview(); return ()=>{cancelled=true;if(channel)supabase.removeChannel(channel)}},[familyId])

  // FAMILY POLLS
  useEffect(()=>{if(!familyId)return; let cancelled=false; async function loadPolls(){setPollLoading(true); const {data}=await supabase.from('family_polls').select('*').eq('family_id',familyId).eq('active',true).order('created_at',{ascending:false}); if(!cancelled){setPolls(data||[]);setPollLoading(false)}} loadPolls(); return ()=>{cancelled=true}},[familyId])

  // SHOW ONE ACTIVE FAMILY POLL ON APP OPEN IF NOT VOTED
  useEffect(()=>{if(!familyId||!polls.length)return; let cancelled=false; async function checkVote(){const {data:u}=await supabase.auth.getUser();const user=u.user?.id;if(!user)return; const poll=polls.find(p=>p.popup_enabled && !(p.votes||[]).some((v:any)=>v.user_id===user));if(poll&&!cancelled){setPollPopup(poll);setPollVote('')}} checkVote();return()=>{cancelled=true}},[familyId,polls])

  async function savePoll(){const options=pollOptions.split('\n').map(x=>x.trim()).filter(Boolean);if(!pollTitle.trim()||options.length<2){alert('Enter a poll question and at least two options.');return}const {data:u}=await supabase.auth.getUser();const payload={family_id:familyId,title:pollTitle.trim(),options,active:true,popup_enabled:true,created_by:u.user?.id,votes:[]};const {data,error}=editingPollId?await supabase.from('family_polls').update({title:payload.title,options,popup_enabled:true}).eq('id',editingPollId).select().single():await supabase.from('family_polls').insert(payload).select().single();if(error){alert('Poll save failed: '+error.message);return}setPolls(p=>[data,...p]);setPollTitle('');setPollOptions('');setShowPollForm(false);setEditingPollId(null)}
  async function deletePoll(id:string){if(!confirm('Delete this poll?'))return;const {error}=await supabase.from('family_polls').delete().eq('id',id).eq('family_id',familyId);if(error){alert(error.message);return}setPolls(p=>p.filter(x=>x.id!==id));if(pollPopup?.id===id)setPollPopup(null)}
  async function votePoll(){if(!pollPopup||!pollVote)return;const {data:u}=await supabase.auth.getUser();const user=u.user?.id;if(!user)return;const votes=[...(pollPopup.votes||[]),{user_id:user,option:pollVote,created_at:new Date().toISOString()}];const {data,error}=await supabase.from('family_polls').update({votes}).eq('id',pollPopup.id).select().single();if(error){alert('Vote failed: '+error.message);return}setPolls(p=>p.map(x=>x.id===data.id?data:x));setPollPopup(null)}

  // LOAD FAMILY TASKS

  useEffect(() => {
    if (!familyId) return

    let cancelled = false

    async function loadTasks() {
      setTasksLoading(true)

      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('id, title, description, assigned_to, due_at, priority, completed_at, recurrence')
        .eq('family_id', familyId)
        .order('due_at', { ascending: true })

      if (cancelled) return

      if (error) {
        console.error('Could not load tasks:', error)
        setTasksLoading(false)
        return
      }

      const { data: members } = await supabase
        .from('family_members')
        .select('user_id, display_name')
        .eq('family_id', familyId)

      if (cancelled) return

      const names: Record<string, string> = {}

      members?.forEach(member => {
        names[member.user_id] = member.display_name || 'Family member'
      })

      setTaskMembers(names)
      setTasks(taskData || [])
      setTasksLoading(false)
    }

    loadTasks()

    return () => {
      cancelled = true
    }
  }, [familyId])

  // LOAD FAMILY CALENDAR EVENTS

useEffect(() => {
  if (!familyId) return

  let cancelled = false

  async function loadEvents() {
    setEventsLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, location, starts_at, ends_at')
      .eq('family_id', familyId)
      .order('starts_at', { ascending: true })
      .limit(200)

    if (cancelled) return

    if (error) {
      console.error('Could not load family events:', error)
      setEventsLoading(false)
      return
    }

    setFamilyEvents(data || [])
    setEventsLoading(false)
  }

  loadEvents()

  return () => {
    cancelled = true
  }
}, [familyId])

  // MARK TASK COMPLETE OR INCOMPLETE

  async function toggleTask(task: FamilyTask) {
    if (updatingTask) return

    setUpdatingTask(task.id)

    const newCompletedAt = task.completed_at
      ? null
      : new Date().toISOString()

    const { error } = await supabase
      .from('tasks')
      .update({ completed_at: newCompletedAt })
      .eq('id', task.id)
      .eq('family_id', familyId)

    if (error) {
      console.error('Could not update task:', error)
      alert('Could not update this task. Please try again.')
    } else {
      setTasks(current =>
        current.map(item =>
          item.id === task.id
            ? { ...item, completed_at: newCompletedAt }
            : item
        )
      )
    }

    setUpdatingTask('')
  }

  async function updateRecurrence(task:FamilyTask,value:string){const {error}=await supabase.from('tasks').update({recurrence:value||null}).eq('id',task.id).eq('family_id',familyId);if(error){alert('Could not update recurrence: '+error.message);return}setTasks(current=>current.map(t=>t.id===task.id?{...t,recurrence:value||null}:t))}

  function dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function openEventForm() {
    setEventTitle('')
    setEventDescription('')
    setEventLocation('')
    setEventStart(`${selectedCalendarDate}T12:00`)
    setEventEnd('')
    setEventError('')
    setShowEventForm(true)
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!familyId || !eventTitle.trim() || !eventStart) return
    setSavingEvent(true)
    setEventError('')
    const { data, error } = await supabase.from('events').insert({
      family_id: familyId,
      title: eventTitle.trim(),
      description: eventDescription.trim() || null,
      location: eventLocation.trim() || null,
      starts_at: new Date(eventStart).toISOString(),
      ends_at: eventEnd ? new Date(eventEnd).toISOString() : null,
    }).select('id, title, description, location, starts_at, ends_at').single()
    if (error) {
      setEventError(error.message)
    } else if (data) {
      setFamilyEvents(current => [...current, data].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
      setShowEventForm(false)
    }
    setSavingEvent(false)
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Delete this family event?')) return
    const { error } = await supabase.from('events').delete().eq('id', eventId).eq('family_id', familyId)
    if (error) alert(`Could not delete event: ${error.message}`)
    else setFamilyEvents(current => current.filter(item => item.id !== eventId))
  }

  const photos = [
    { id: 1, color: 'photo-one', label: 'Photo 1' },
    { id: 2, color: 'photo-two', label: 'Photo 2' },
    { id: 3, color: 'photo-three', label: 'Photo 3' },
  ]


  function answerRequest() {
    setRequestAnswered(true)
    setShowRequest(false)
    setSelectedPhoto(null)
  }

  return (
    <div className={`app-shell ${appearance === 'dark' ? 'theme-dark' : ''}`} style={{ ['--accent' as string]: accent, ['--app-bg' as string]: appearance === 'dark' ? '#111214' : '#f5f5f7', ['--app-surface' as string]: appearance === 'dark' ? '#1d1e21' : '#ffffff', ['--app-text' as string]: appearance === 'dark' ? '#f5f5f7' : '#1c1c1e', ['--app-muted' as string]: appearance === 'dark' ? '#a1a1a8' : '#86868b', ['--app-line' as string]: appearance === 'dark' ? '#35363a' : '#e6e6eb' }}>
      <main className="app-content">

        {/* HOME */}

        {activeTab === 'Home' && (
          <div className="home-layout">
            <header className="top-header">
              <div className="header-left">
                <div className="family-icon">
                  <Users size={23} />
                </div>

                <div>
                  <p className="eyebrow">YOUR FAMILY</p>
                  <h1>{familyName}</h1>
                </div>
              </div>

              <button className="header-button" aria-label="Notifications">
                <Bell size={21} />
                <span className="notification-dot" />
              </button>
            </header>

            {!requestAnswered && (
              <button
                className="persistent-request"
                onClick={() => setShowRequest(true)}
              >
                <span className="request-alert-icon">
                  <Bell size={17} />
                </span>

                <span className="request-alert-text">
                  <strong>Action needed</strong>
                  <small>Vote on the Christmas card photo</small>
                </span>

                <ChevronRight size={19} />
              </button>
            )}

            {homeWidgets.includes('calendar') && <section className="dashboard-section calendar-section">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">STAY IN THE LOOP</p>
                  <h2>Family Calendar</h2>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActiveTab('Calendar')}
                >
                  See all <ChevronRight size={16} />
                </button>
              </div>

              <div className="date-strip">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date()
                  date.setDate(date.getDate() + i)
                  const key = dateKey(date)
                  return <button type="button" className={`date-item ${key === selectedCalendarDate ? 'date-active' : ''}`} key={key} onClick={() => { setSelectedCalendarDate(key); setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setActiveTab('Calendar') }}>
                    <span>{date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</span><strong>{date.getDate()}</strong>
                  </button>
                })}
              </div>
              {familyEvents.filter(event => new Date(event.starts_at) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 2).map(event => (
                <div className="event-card" key={event.id}>
                  <div className="event-date"><span>{new Date(event.starts_at).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span><strong>{new Date(event.starts_at).getDate()}</strong></div>
                  <div className="event-details"><strong>{event.title}</strong><span><Clock size={13} /> {new Date(event.starts_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>{event.location && <span><MapPin size={13} /> {event.location}</span>}</div><div className="event-indicator" />
                </div>
              ))}
              {!eventsLoading && familyEvents.filter(event => new Date(event.starts_at) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && <p className="muted-text">No upcoming events yet.</p>}
            </section>}

            {homeWidgets.includes('messages') && <section className="dashboard-section messages-section">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">KEEP CONNECTED</p>
                  <h2>Family Messages</h2>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActiveTab('Messages')}
                >
                  See all <ChevronRight size={16} />
                </button>
              </div>

              <button className="family-chat-preview" onClick={() => setActiveTab('Messages')}>
                <div className="group-avatar"><Users size={22}/></div>
                <div className="conversation-content"><div className="conversation-title"><strong>Family Group</strong><span>{groupPreview?new Date(groupPreview.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):''}</span></div>
                <p>{groupPreview?groupPreview.content.replace(/^PHOTO::/, '📷 Photo ').slice(0,150):'No messages yet. Start a conversation!'}</p></div>
              </button>
            </section>}
            {homeWidgets.includes('tasks')&&<section className="dashboard-section"><div className="section-heading"><div><p className="section-kicker">FAMILY TO-DO</p><h2>Tasks</h2></div><button className="text-button" onClick={()=>{setActiveTab('More');setMoreSection('Tasks')}}>See all <ChevronRight size={16}/></button></div>{tasks.filter(t=>!t.completed_at).slice(0,3).map(t=><div className="task-modern" key={t.id}><button className="task-check" onClick={()=>toggleTask(t)}><Check/></button><div><strong>{t.title}</strong><small>{t.due_at?new Date(t.due_at).toLocaleDateString():'No due date'}</small></div></div>)}{!tasks.filter(t=>!t.completed_at).length&&<p className="muted-text">All caught up!</p>}</section>}
            {homeWidgets.includes('polls')&&<section className="dashboard-section"><div className="section-heading"><div><p className="section-kicker">FAMILY DECISIONS</p><h2>Polls</h2></div><button className="text-button" onClick={()=>{setActiveTab('More');setMoreSection('Polls')}}>Manage <ChevronRight size={16}/></button></div>{polls.slice(0,2).map(p=><div className="placeholder-card" key={p.id}><strong>{p.title}</strong><small>{p.options?.length||0} choices</small></div>)}{!polls.length&&<p className="muted-text">No active polls.</p>}</section>}
            {homeWidgets.includes('ai')&&<button className="memory-home-card" onClick={()=>setActiveTab('Family AI')}><Sparkles size={22}/><span><strong>Family AI</strong><small>Ask for help planning, organizing or brainstorming</small></span><ChevronRight/></button>}
            {homeWidgets.includes('memories') && <button className="memory-home-card" onClick={()=>{setActiveTab('More');setMoreSection('Gallery')}}><Sparkles size={22}/><span><strong>Family memories</strong><small>Open Gallery to revisit favorite photos and create a slideshow</small></span><ChevronRight/></button>}
          </div>
        )}

        {/* MESSAGES */}

        {activeTab === 'Messages' && (
          <Messaging />
        )}

        {/* CALENDAR */}

        {activeTab === 'Calendar' && (
          <div className="full-page">
            <header className="page-header"><div><p className="section-kicker">EVERYONE, IN ONE PLACE</p><h1>Calendar</h1></div><button className="round-action" onClick={openEventForm} aria-label="Add event"><Plus size={21}/></button></header>
            <div className="calendar-month-controls"><button className="round-action" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1))}>‹</button><h2>{calendarMonth.toLocaleDateString(undefined, {month:'long', year:'numeric'})}</h2><button className="round-action" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1))}>›</button></div>
            <div className="calendar-grid">
              {['S','M','T','W','T','F','S'].map((day,i)=><div className="calendar-weekday" key={i}>{day}</div>)}
              {Array.from({length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()}, (_,i)=><div className="calendar-cell calendar-empty" key={`blank-${i}`}/>)}
              {Array.from({length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 0).getDate()}, (_,i)=>{
                const day = i+1; const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day); const key=dateKey(date); const hasEvent=familyEvents.some(event=>dateKey(new Date(event.starts_at))===key)
                return <button className={`calendar-cell ${selectedCalendarDate===key?'calendar-selected':''} ${hasEvent?'calendar-has-event':''}`} key={key} onClick={()=>setSelectedCalendarDate(key)}><span>{day}</span>{hasEvent&&<i/>}</button>
              })}
            </div>
            <div className="calendar-day-heading"><h3>{new Date(`${selectedCalendarDate}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</h3><button className="text-button" onClick={openEventForm}><Plus size={16}/> Add event</button></div>
            {eventsLoading?<div className="placeholder-card">Loading events...</div>:familyEvents.filter(event=>dateKey(new Date(event.starts_at))===selectedCalendarDate).sort((a,b)=>a.starts_at.localeCompare(b.starts_at)).map(event=><div className="placeholder-card calendar-event-card" key={event.id}><div className="event-details"><h3>{event.title}</h3><span><Clock size={13}/> {new Date(event.starts_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}{event.ends_at?` – ${new Date(event.ends_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`:''}</span>{event.location&&<span><MapPin size={13}/> {event.location}</span>}{event.description&&<p>{event.description}</p>}</div><button className="text-button" onClick={()=>deleteEvent(event.id)}>Delete</button></div>)}
            {!eventsLoading&&familyEvents.filter(event=>dateKey(new Date(event.starts_at))===selectedCalendarDate).length===0&&<div className="placeholder-card"><CalendarDays size={28}/><h3>No events this day</h3><p>Tap Add event to put something on the family calendar.</p></div>}
            {showEventForm&&<div className="modal-backdrop"><form className="request-modal event-form" onSubmit={saveEvent}><button type="button" className="modal-close" onClick={()=>setShowEventForm(false)} aria-label="Close"><X size={20}/></button><h2>Add family event</h2><label>Title<input required value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="Event name"/></label><label>Description<textarea value={eventDescription} onChange={e=>setEventDescription(e.target.value)} placeholder="Details (optional)"/></label><label>Location<input value={eventLocation} onChange={e=>setEventLocation(e.target.value)} placeholder="Location (optional)"/></label><label>Starts<input required type="datetime-local" value={eventStart} onChange={e=>setEventStart(e.target.value)}/></label><label>Ends<input type="datetime-local" value={eventEnd} onChange={e=>setEventEnd(e.target.value)}/></label>{eventError&&<p className="form-error">{eventError}</p>}<button className="submit-vote" disabled={savingEvent}>{savingEvent?'Saving...':'Save event'}</button></form></div>}
          </div>
        )}

        {/* FAMILY AI */}

        {activeTab === 'Family AI' && (
          <FamilyAI />
        )}

        {/* GALLERY */}
        {activeTab === 'More' && moreSection === 'Gallery' && familyId && <div className='full-page'><header className='page-header'><button className='text-button' onClick={()=>setMoreSection('')}><ChevronRight className='back-chevron'/> More</button><h1>Gallery</h1></header><Gallery familyId={familyId} /></div>}

        {/* MORE */}
        {activeTab === 'More' && !moreSection && (
          <div className="full-page more-page">
            <header className="page-header"><div><p className="section-kicker">YOUR FAMILY SPACE</p><h1>More</h1></div></header>
            <div className="more-list">
              {[['Polls','poll','Create and manage family voting'],['Gallery','image','Family photos and memories'],['Tasks','check-square','Shared tasks and recurring chores'],['Customization','palette','Personalize your Family Hub'],['Family settings','users','Members and invitations']].map(([name,icon,desc])=><button key={name} onClick={()=>setMoreSection(name)} className="more-row"><span className="more-row-icon">{name==='Polls'?<Bell/>:name==='Gallery'?<Image/>:name==='Tasks'?<CheckSquare/>:name==='Customization'?<Sparkles/>:<Users/>}</span><span><strong>{name}</strong><small>{desc}</small></span><ChevronRight/></button>)}
            </div>
            <button className="invite-row" onClick={()=>setShowInvites(true)}><Users size={18}/> Invite family members</button>
          </div>
        )}
        {activeTab==='More'&&moreSection==='Polls'&&<div className="full-page"><header className="page-header"><button className="text-button" onClick={()=>setMoreSection('')}><ChevronRight className="back-chevron"/> More</button><h1>Family Polls</h1><button className="round-action" onClick={()=>setShowPollForm(true)}><Plus/></button></header><p>Create questions that appear to family members when they open Family Hub.</p>{polls.map(p=><div className="settings-card" key={p.id}><h3>{p.title}</h3><p>{(p.options||[]).join(' · ')}</p><div className="setting-row"><span>Votes</span><span>{(p.votes||[]).length}</span></div><button className="setting-action" onClick={()=>{setEditingPollId(p.id);setPollTitle(p.title);setPollOptions((p.options||[]).join('\n'));setShowPollForm(true)}}>Edit poll</button><button className="setting-action" onClick={()=>deletePoll(p.id)}>Remove poll</button></div>)}{!polls.length&&!pollLoading&&<div className="placeholder-card">No active polls. Create one to ask the family a question.</div>}{showPollForm&&<div className="modal-backdrop"><form className="request-modal event-form" onSubmit={e=>{e.preventDefault();savePoll()}}><button type="button" className="modal-close" onClick={()=>{setShowPollForm(false);setEditingPollId(null)}}><X/></button><h2>{editingPollId?'Edit family poll':'Create family poll'}</h2><label>Question<input value={pollTitle} onChange={e=>setPollTitle(e.target.value)} placeholder="What should we do this weekend?" required/></label><label>Options (one per line)<textarea value={pollOptions} onChange={e=>setPollOptions(e.target.value)} rows={5} placeholder={'Go bowling\nMovie night\nEat out'} required/></label><button className="submit-vote">Create poll</button></form></div>}</div>}
        {activeTab === 'More' && moreSection === 'Customization' && (
          <div className="full-page settings-page"><header className="page-header"><button className="text-button" onClick={()=>setMoreSection('')}><ChevronRight className="back-chevron"/> More</button><h1>Customization</h1></header>
            <section className="settings-card"><h3>Appearance</h3><div className="setting-row"><span>Color scheme</span><select value={appearance} onChange={e=>setAppearance(e.target.value)}><option value="system">System (light)</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div className="setting-row"><span>Accent color</span><input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></div></section>
            <section className="settings-card"><h3>Home dashboard</h3><p>Choose the sections shown on your Home screen.</p>{[['calendar','Calendar'],['messages','Family group chat'],['tasks','Tasks preview'],['polls','Active polls'],['memories','Gallery & memories'],['ai','Family AI shortcut']].map(([key,label])=><label className="widget-toggle" key={key}><span>{label}</span><input type="checkbox" checked={homeWidgets.includes(key)} onChange={e=>setHomeWidgets(w=>e.target.checked?[...w,key]:w.filter(x=>x!==key))}/></label>)}</section>
            <section className="settings-card"><h3>Chat appearance</h3><p>Chat styling is local to your own account. Other family members' settings won't change.</p><button className="setting-action" onClick={()=>localStorage.setItem('fh-chat-tint',accent)}>Use accent in my chat</button></section>
          </div>
        )}
        {activeTab === 'More' && moreSection === 'Tasks' && (
          <div className="full-page"><header className="page-header"><button className="text-button" onClick={()=>setMoreSection('')}><ChevronRight className="back-chevron"/> More</button><h1>Tasks</h1><button className="round-action" onClick={()=>setActiveTab('Family AI')}><Plus/></button></header>
          {tasksLoading?<div className="placeholder-card">Loading family tasks…</div>:<><div className="family-task-list"><p className="section-kicker">TO DO ({tasks.filter(t=>!t.completed_at).length})</p>{tasks.filter(t=>!t.completed_at).map(task=><div className="task-modern" key={task.id}><button className="task-check" onClick={()=>toggleTask(task)} disabled={updatingTask===task.id}><Check/></button><div><strong>{task.title}</strong>{task.description&&<p>{task.description}</p>}<small>{task.assigned_to?taskMembers[task.assigned_to]||'Family member':'Unassigned'} · {task.priority||'Medium'}{task.due_at?` · ${new Date(task.due_at).toLocaleDateString()}`:''}</small><select className="task-repeat" value={task.recurrence||''} onChange={e=>updateRecurrence(task,e.target.value)}><option value="">No repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div></div>)}{!tasks.filter(t=>!t.completed_at).length&&<div className="placeholder-card">Nothing to do right now.</div>}</div><div className="family-task-list"><p className="section-kicker">COMPLETED</p>{tasks.filter(t=>t.completed_at).map(task=><div className="task-modern completed" key={task.id}><button className="task-check" onClick={()=>toggleTask(task)}><Check/></button><div><strong>{task.title}</strong><small>Completed · tap to reopen</small></div></div>)}</div></>}
          </div>
        )}
        {activeTab === 'More' && moreSection === 'Family settings' && (<div className="full-page"><header className="page-header"><button className="text-button" onClick={()=>setMoreSection('')}><ChevronRight className="back-chevron"/> More</button><h1>Family settings</h1></header><div className="settings-card"><h3>Family members</h3><button className="setting-action" onClick={()=>setShowInvites(true)}>Invite members</button></div></div>)}

      </main>

      {/* BOTTOM NAVIGATION */}

      <nav className="bottom-nav">
        {[{name:'Home' as Tab,icon:Home},{name:'Messages' as Tab,icon:MessageCircle},{name:'Calendar' as Tab,icon:CalendarDays},{name:'Family AI' as Tab,icon:Sparkles},{name:'More' as Tab,icon:MoreHorizontal}].map(item=>{const Icon=item.icon;return <button className={`nav-item ${activeTab===item.name?'nav-active':''}`} key={item.name} onClick={()=>{setActiveTab(item.name);setMoreSection('')}}><Icon size={21} strokeWidth={activeTab===item.name?2.5:1.9}/><span>{item.name}</span></button>})}
      </nav>

      {/* INVITATION POPUP */}

      {showInvites && (
        <div className="modal-backdrop">
          <div className="request-modal">
            <button
              className="modal-close"
              onClick={() => setShowInvites(false)}
              aria-label="Close invitations"
            >
              <X size={21} />
            </button>

            <InviteMembers />
          </div>
        </div>
      )}

    </div>
  )
}

// MAIN APP AND AUTHENTICATION

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasFamily, setHasFamily] = useState<boolean | null>(null)
  const [needsName, setNeedsName] = useState(false)
  const [familyError, setFamilyError] = useState('')
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
  const [approvalChecked, setApprovalChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    let cancelled = false

    async function checkFamily() {
      setHasFamily(null)
      setFamilyError('')

      // Check whether this person arrived through an invitation.

      const invitationToken = new URLSearchParams(
        window.location.search
      ).get('invite')

      if (invitationToken) {
        const { error: invitationError } = await supabase.rpc(
          'accept_family_invitation',
          { p_token: invitationToken }
        )

        if (cancelled) return

        if (invitationError) {
          setFamilyError(
            `Could not accept invitation: ${invitationError.message}`
          )
          return
        }

        // Remove the invitation token after successful acceptance.

        const url = new URL(window.location.href)
        url.searchParams.delete('invite')

        window.history.replaceState(
          {},
          '',
          `${url.pathname}${url.search}${url.hash}`
        )
      }

      // Check whether the signed-in user belongs to a family.

      const { data, error } = await supabase
        .from('family_members')
        .select('id, display_name')
        .eq('user_id', session?.user.id || '')
        .limit(1)

      if (cancelled) return

      if (error) {
        setFamilyError(error.message)
        return
      }

      setHasFamily(data.length > 0)
      setNeedsName(data.length > 0 && !data[0].display_name)
      if (data.length === 0 && !invitationToken && session?.user.email) {
        const { data: access } = await supabase.from('family_signup_requests').select('status').eq('email', session.user.email.toLowerCase()).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!cancelled) setApprovalStatus(access?.status || 'none')
      } else {
        setApprovalStatus('approved')
      }
      if (!cancelled) setApprovalChecked(true)
    }

    checkFamily()

    return () => {
      cancelled = true
    }
  }, [session])

  if (window.location.pathname === '/welcome') return <PublicPage />

  if (loading) {
    return <div className="auth-page">Loading Family Hub...</div>
  }

  if (!session) {
    return <Auth />
  }

  if (familyError) {
    return (
      <div className="auth-page">
        Could not load your family: {familyError}
      </div>
    )
  }

  if (hasFamily === null) {
    return <div className="auth-page">Loading your family...</div>
  }

  if (!hasFamily && !approvalChecked) return <div className="auth-page">Checking access…</div>

  if (!hasFamily && approvalStatus !== 'approved') {
    return <div className="auth-page"><div style={{maxWidth:460,margin:'auto',padding:28,background:'white',borderRadius:18}}><h1>Family Hub access</h1><p>{approvalStatus === 'pending' ? 'Your request is awaiting approval.' : approvalStatus === 'rejected' ? 'Your request was not approved. You can submit another request.' : 'Family Hub is currently approval-only. Request access before creating your family.'}</p><a href="/welcome">Request or check access</a><p style={{marginTop:24}}><button onClick={() => supabase.auth.signOut()}>Sign out</button></p></div></div>
  }

  if (!hasFamily) {
    return (
      <FamilySetup
        onCreated={() => {
          setHasFamily(true)
          setNeedsName(true)
        }}
      />
    )
  }

  if (needsName) {
    return <MemberSetup onSaved={() => setNeedsName(false)} />
  }

  return <Dashboard />
}

export default App