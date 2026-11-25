import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Heart, Images, Plus, Sparkles, Trash2, X } from 'lucide-react'
import './Gallery.css'

type Media = { id:string; family_id:string; conversation_id:string|null; message_id:string|null; uploader_id:string; storage_path:string; caption:string|null; created_at:string; is_favorite:boolean; url?:string }
type Removal = { id:string; media_id:string; requester_id:string; uploader_id:string; status:string; media?:Media }
type Memory = { id:string; title:string; status:string; created_at:string }

export default function Gallery({familyId}:{familyId:string}) {
  const [items,setItems]=useState<Media[]>([])
  const [removals,setRemovals]=useState<Removal[]>([])
  const [memories,setMemories]=useState<Memory[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [tab,setTab]=useState<'all'|'favorites'|'albums'|'memories'>('all')
  const [albumName,setAlbumName]=useState('')
  const [albums,setAlbums]=useState<{id:string;title:string}[]>([])
  const [memoryTitle,setMemoryTitle]=useState('')
  const [memoryIds,setMemoryIds]=useState<string[]>([])
  const [selected,setSelected]=useState<Media|null>(null)
  const [requesting,setRequesting]=useState(false)
  const [currentUserId,setCurrentUserId]=useState('')
  const [activeAlbum,setActiveAlbum]=useState<{id:string;title:string}|null>(null)
  const [albumSelected,setAlbumSelected]=useState<string[]>([])
  const [slideshow,setSlideshow]=useState<{title:string;photos:string[];index:number}|null>(null)
  const [uploading,setUploading]=useState(false)

  async function load(){
    setLoading(true);setError('')
    const {data,error:e}=await supabase.from('family_gallery_media').select('*').eq('family_id',familyId).order('created_at',{ascending:false})
    if(e){setError('Gallery database setup is not complete yet. Apply the included Gallery migration in Supabase.');setLoading(false);return}
    const rows=(data||[]) as Media[]
    const {data:removalData}=await supabase.from('family_gallery_removal_requests').select('*').eq('family_id',familyId).eq('status','pending')
    const user=(await supabase.auth.getUser()).data.user
    setCurrentUserId(user?.id||'')
    const hiddenForRequester=new Set((removalData||[]).filter(r=>r.requester_id===user?.id).map(r=>r.media_id))
    const visibleRows=rows.filter(row=>!hiddenForRequester.has(row.id))
    const enriched=await Promise.all(visibleRows.map(async row=>{const {data:link}=await supabase.storage.from('family-gallery').createSignedUrl(row.storage_path,3600);return {...row,url:link?.signedUrl}}))
    setItems(enriched)
    const {data:albumData}=await supabase.from('family_gallery_albums').select('id,title').eq('family_id',familyId).order('created_at',{ascending:false})
    setAlbums(albumData||[])
    setRemovals(removalData||[])
    const {data:memoryData}=await supabase.from('family_gallery_memories').select('id,title,status,created_at').eq('family_id',familyId).order('created_at',{ascending:false})
    setMemories(memoryData||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[familyId])

  async function upload(files:FileList|null){
    if(!files?.length)return
    setUploading(true);setError('')
    const user=(await supabase.auth.getUser()).data.user
    if(!user){setError('Sign in again to upload.');setUploading(false);return}
    for(const file of Array.from(files)){
      if(!file.type.startsWith('image/')&&!file.type.startsWith('video/'))continue
      const path=`${familyId}/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      const {error:uploadError}=await supabase.storage.from('family-gallery').upload(path,file,{upsert:false})
      if(uploadError){setError(uploadError.message);continue}
      const {error:insertError}=await supabase.from('family_gallery_media').insert({family_id:familyId,uploader_id:user.id,storage_path:path,caption:null})
      if(insertError)setError(insertError.message)
    }
    await load();setUploading(false)
  }
  async function favorite(item:Media){const {error:e}=await supabase.from('family_gallery_media').update({is_favorite:!item.is_favorite}).eq('id',item.id);if(e)setError(e.message);else setItems(rows=>rows.map(r=>r.id===item.id?{...r,is_favorite:!r.is_favorite}:r))}
  async function requestRemoval(item:Media){const user=(await supabase.auth.getUser()).data.user;if(!user)return;setRequesting(true);const {error:e}=await supabase.from('family_gallery_removal_requests').insert({media_id:item.id,family_id:familyId,requester_id:user.id,uploader_id:item.uploader_id,status:'pending'});if(e)setError(e.message);else {setSelected(null);setItems(rows=>rows.filter(r=>r.id!==item.id));load()}setRequesting(false)}
  async function createAlbum(){if(!albumName.trim())return;const user=(await supabase.auth.getUser()).data.user;if(!user)return;const {data,error:e}=await supabase.from('family_gallery_albums').insert({family_id:familyId,title:albumName.trim(),created_by:user.id}).select('id,title').single();if(e)setError(e.message);else{setAlbums(a=>[data,...a]);setAlbumName('')}}
  async function saveAlbumPhotos(){if(!activeAlbum||!albumSelected.length)return;const rows=albumSelected.map(media_id=>({album_id:activeAlbum.id,media_id,family_id:familyId}));const {error:e}=await supabase.from('family_gallery_album_items').upsert(rows,{onConflict:'album_id,media_id'});if(e)setError(e.message);else setAlbumSelected([])}
  async function proposeMemory(){if(!memoryTitle.trim()||memoryIds.length<2)return;const user=(await supabase.auth.getUser()).data.user;if(!user)return;const {data,error:e}=await supabase.from('family_gallery_memories').insert({family_id:familyId,title:memoryTitle.trim(),created_by:user.id,status:'pending'}).select('id').single();if(e){setError(e.message);return}const links=memoryIds.map(media_id=>({memory_id:data.id,media_id,family_id:familyId}));const {error:le}=await supabase.from('family_gallery_memory_items').insert(links);if(le)setError(le.message);else setMemoryTitle('')}
  async function decideRemoval(req:Removal,approve:boolean){if(!approve){const {error:e}=await supabase.from('family_gallery_removal_requests').update({status:'declined',decided_at:new Date().toISOString()}).eq('id',req.id);if(e)setError(e.message);else load();return}const {error:e}=await supabase.from('family_gallery_removal_requests').update({status:'approved',decided_at:new Date().toISOString()}).eq('id',req.id);if(e){setError(e.message);return}const media=items.find(i=>i.id===req.media_id);if(media){await supabase.from('family_gallery_media').delete().eq('id',media.id)}load()}
  async function acceptMemory(id:string){const {error:e}=await supabase.from('family_gallery_memories').update({status:'accepted'}).eq('id',id).eq('family_id',familyId);if(e)setError(e.message);else load()}
  async function playMemory(memory:Memory){const {data,error:e}=await supabase.from('family_gallery_memory_items').select('media_id').eq('memory_id',memory.id).order('media_id');if(e){setError(e.message);return}const selectedItems=items.filter(i=>(data||[]).some(row=>row.media_id===i.id));if(selectedItems.length)setSlideshow({title:memory.title,photos:selectedItems.map(i=>i.url||'').filter(Boolean),index:0})}
  const visible=tab==='favorites'?items.filter(i=>i.is_favorite):items
  return <section className="gallery-page">
    <header className="gallery-header"><div><div className="eyebrow">TOGETHER, IN PHOTOS</div><h1>Gallery</h1></div><label className="gallery-upload"><Plus size={18}/>{uploading?'Uploading…':'Add photos'}<input type="file" multiple accept="image/*,video/*" onChange={e=>upload(e.target.files)} disabled={uploading}/></label></header>
    <nav className="gallery-tabs">{(['all','favorites','albums','memories'] as const).map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t==='all'?'All':t==='favorites'?'Favorites':t==='albums'?'Albums':'Memories'}</button>)}</nav>
    {error&&<div className="gallery-error">{error}</div>}
    {loading?<div className="gallery-empty">Loading family photos…</div>:tab==='albums'?<div className="gallery-albums"><form onSubmit={e=>{e.preventDefault();createAlbum()}}><input value={albumName} onChange={e=>setAlbumName(e.target.value)} placeholder="New album name"/><button type="submit"><Plus size={17}/> Create album</button></form>{albums.map(a=><button className="gallery-album-row" key={a.id} onClick={()=>setActiveAlbum(a)}><Images size={21}/><span>{a.title}</span></button>)}{!albums.length&&<p>Create albums for trips, birthdays, holidays, and anything worth keeping.</p>}{activeAlbum&&<div className="album-detail"><h3>{activeAlbum.title}</h3><button className="album-back" onClick={()=>setActiveAlbum(null)}>Back to albums</button><p>Select photos to add.</p><div className="gallery-grid">{items.map(i=><button key={i.id} className={`gallery-tile ${albumSelected.includes(i.id)?'tile-selected':''}`} onClick={()=>setAlbumSelected(v=>v.includes(i.id)?v.filter(x=>x!==i.id):[...v,i.id])}>{i.url?<img src={i.url} alt={i.caption||''}/>:null}</button>)}</div><button className="album-save" onClick={saveAlbumPhotos} disabled={!albumSelected.length}>Add {albumSelected.length} photos</button></div>}</div>:tab==='memories'?<div className="gallery-memories"><div className="memory-create"><Sparkles/><h2>Create a family memory</h2><p>Select photos from the gallery and propose a collection. One family member can accept it to publish.</p><input placeholder="Memory title" value={memoryTitle} onChange={e=>setMemoryTitle(e.target.value)}/><p>{memoryIds.length} photos selected</p><button onClick={proposeMemory} disabled={memoryIds.length<2||!memoryTitle.trim()}>Propose memory</button></div><div className="gallery-grid">{items.map(i=><button key={i.id} className={`gallery-tile ${memoryIds.includes(i.id)?'tile-selected':''}`} onClick={()=>setMemoryIds(v=>v.includes(i.id)?v.filter(x=>x!==i.id):[...v,i.id])}>{i.url?<img src={i.url} alt={i.caption||''}/>:<span>Media</span>}</button>)}</div><div className="memory-pending"><h3>Memory proposals</h3>{memories.map(m=><div className="memory-proposal" key={m.id}><strong>{m.title}</strong><small>{m.status==='accepted'?'Shared memory':'Awaiting family acceptance'}</small>{m.status==='pending'&&<button onClick={()=>acceptMemory(m.id)}>Accept memory</button>}{m.status==='accepted'&&<button onClick={()=>playMemory(m)}>Play slideshow</button>}</div>)}{!memories.length&&<p>Proposed memories appear here.</p>}</div><div className="memory-pending"><h3>Photo removal requests</h3>{removals.filter(r=>r.uploader_id===currentUserId).map(r=><div className="memory-proposal" key={r.id}><strong>Photo removal requested</strong><small>Approval removes it from the shared Gallery, not from its original chat.</small><div className="removal-controls"><button onClick={()=>decideRemoval(r,true)}>Approve</button><button onClick={()=>decideRemoval(r,false)}>Decline</button></div></div>)}{!removals.length&&<p>No removal requests.</p>}</div></div>:<div className="gallery-grid">{visible.map(item=><button key={item.id} className="gallery-tile" onClick={()=>setSelected(item)}>{item.url?item.storage_path.match(/\.(mp4|mov|webm)$/i)?<video src={item.url} muted/>:<img src={item.url} alt={item.caption||'Family photo'}/>:<span>Media</span>}{item.is_favorite&&<Heart className="tile-heart" size={18} fill="currentColor"/>}</button>)}{!visible.length&&<div className="gallery-empty"><Images size={32}/><h3>No photos yet</h3><p>Share photos in the family chat or upload them here.</p></div>}</div>}
    {selected&&<div className="gallery-lightbox" onClick={()=>setSelected(null)}><div className="gallery-lightbox-panel" onClick={e=>e.stopPropagation()}><button className="gallery-close" onClick={()=>setSelected(null)}><X/></button>{selected.url&&<img src={selected.url} alt={selected.caption||'Family photo'}/>}<div className="gallery-actions"><button onClick={()=>favorite(selected)}><Heart fill={selected.is_favorite?'currentColor':'none'}/> {selected.is_favorite?'Remove favorite':'Favorite'}</button><button disabled={requesting} onClick={()=>requestRemoval(selected)}><Trash2/> Request removal</button></div><small>Uploaded {new Date(selected.created_at).toLocaleDateString()}</small></div></div>}
    {slideshow&&<div className="gallery-lightbox slideshow"><div className="gallery-lightbox-panel"><button className="gallery-close" onClick={()=>setSlideshow(null)}><X/></button><h2>{slideshow.title}</h2>{slideshow.photos[slideshow.index]&&<img src={slideshow.photos[slideshow.index]} alt={slideshow.title}/>}<div className="gallery-actions"><button disabled={slideshow.index===0} onClick={()=>setSlideshow(v=>v?{...v,index:v.index-1}:v)}>Previous</button><small>{slideshow.index+1} / {slideshow.photos.length}</small><button disabled={slideshow.index>=slideshow.photos.length-1} onClick={()=>setSlideshow(v=>v?{...v,index:v.index+1}:v)}>Next</button></div></div></div>}
  </section>
}
