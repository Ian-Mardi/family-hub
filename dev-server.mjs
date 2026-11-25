import http from 'node:http'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
if (fs.existsSync('.dev.env')) { for (const line of fs.readFileSync('.dev.env','utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if(m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['\"]|['\"]$/g,'') } }
const host='127.0.0.1', port=5174
const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .dev.env'); process.exit(1) }
const sb=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
const send=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'http://127.0.0.1:5174','access-control-allow-headers':'content-type'});res.end(JSON.stringify(obj))}
const read=(req)=>new Promise((resolve,reject)=>{let b='';req.on('data',x=>b+=x);req.on('end',()=>resolve(b?JSON.parse(b):{}));req.on('error',reject)})
const html=fs.readFileSync('./dev-dashboard.html','utf8')
const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'http://127.0.0.1:5174','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end()}
 if(req.url==='/'||req.url==='/dashboard'){res.writeHead(200,{'content-type':'text/html'});return res.end(html)}
 try{
  if(req.url==='/api/overview'){
   const [fam,reqs]=await Promise.all([sb.from('families').select('id,name,created_at').order('created_at',{ascending:false}),sb.from('family_signup_requests').select('*').order('created_at',{ascending:false})]);
   if(fam.error) return send(res,500,{error:fam.error.message}); if(reqs.error) return send(res,500,{error:reqs.error.message});
   const families=fam.data||[], requests=reqs.data||[];
   const counts=[]; for(const f of families){const m=await sb.from('family_members').select('id',{count:'exact',head:true}).eq('family_id',f.id); counts.push({...f,members:m.count||0})}
   return send(res,200,{families:counts,requests})
  }
  if(req.url==='/api/family'&&req.method==='POST'){
   const {id}=await read(req);const [family,members,tasks,events,convs]=await Promise.all([sb.from('families').select('*').eq('id',id).single(),sb.from('family_members').select('*').eq('family_id',id),sb.from('tasks').select('*').eq('family_id',id).order('due_at',{ascending:true}).limit(100),sb.from('events').select('*').eq('family_id',id).order('starts_at',{ascending:true}).limit(100),sb.from('conversations').select('id,name,is_group,family_id').eq('family_id',id)]);
   if(family.error)return send(res,404,{error:family.error.message});return send(res,200,{family:family.data,members:members.data||[],tasks:tasks.data||[],events:events.data||[],conversations:convs.data||[]})
  }
  if(req.url==='/api/rename'&&req.method==='POST'){
   const {id,name}=await read(req);const {data,error}=await sb.from('families').update({name}).eq('id',id).select().single();if(error)return send(res,500,{error:error.message});return send(res,200,{family:data})
  }
  if(req.url==='/api/request-status'&&req.method==='POST'){
   const {id,status}=await read(req);if(!['approved','rejected','pending'].includes(status))return send(res,400,{error:'Invalid status'});const {data,error}=await sb.from('family_signup_requests').update({status,reviewed_at:new Date().toISOString()}).eq('id',id).select().single();if(error)return send(res,500,{error:error.message});return send(res,200,{request:data})
  }
  return send(res,404,{error:'Not found'})
 }catch(e){send(res,500,{error:String(e)})}
})
server.listen(port,host,()=>console.log(`Local developer dashboard: http://${host}:${port}`))
