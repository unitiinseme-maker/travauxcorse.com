const crypto=require('node:crypto');
const {cmsConfig,cmsSession}=require('../api/editorial');
const {allowedAdminOrigin}=require('../lib/site-config');
const store=require('../lib/permit-store');
const {STATUSES,POTENTIAL,queryRecords,analyze}=require('../lib/permit-model');
const {synchronize}=require('../lib/permit-sync');
const {get,put}=require('@vercel/blob');
const {company,contactability,validateContact}=require('./permit-contact');
const exportSheet=require('./permit-export');
const ID=/^[a-f0-9]{64}$/;
const fail=(status,message)=>Object.assign(new Error(message),{status});
function send(res,status,value){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));}
async function body(req){let b=req.body;if(b===undefined){let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>16000)throw fail(413,'Contenu trop volumineux.');}b=JSON.parse(raw);}else if(typeof b==='string')b=JSON.parse(b);if(!b||Buffer.byteLength(JSON.stringify(b))>16000)throw fail(400,'Contenu invalide.');return b;}
function clean(v,max){return typeof v==='string'?v.trim().slice(0,max):'';}
async function createProject(p){
  const id=`requests/permit-${p.id}.json`;
  if(await get(id,{access:'private',useCache:false}))return id;
  const project={date:new Date().toISOString(),name:'',email:'',phone:'',trades:p.trades.map(t=>t.name).join(', '),title:`Veille à qualifier — ${p.nature}`,commune:p.commune||p.communeCode,surface:p.area===null?'':String(p.area),description:`Projet issu d’une autorisation publique Sitadel ${p.type} ${p.number}.\n${p.nature} — ${p.group}.\nAutorisation : ${p.date}.\nMétiers suggérés à confirmer : ${p.trades.map(t=>t.name).join(', ')||'Non disponible'}.\nContact client et accord à recueillir manuellement. Ce dossier n’est pas encore une demande client.`,details:`Source Sitadel : ${p.type} ${p.number}`,status:'Analyse par TravauxCorse',assignedArtisans:[],history:[{at:new Date().toISOString(),text:'Brouillon créé manuellement depuis la veille Sitadel. Aucun message envoyé.'}]};
  try{await put(id,JSON.stringify(project),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',cacheControlMaxAge:60});}catch(e){if(!/already exists/i.test(e.message))throw e;}
  return id;
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  const c=cmsConfig(),auth=c.secret&&c.password?cmsSession(req,c):null;
  if(!auth)return send(res,401,{error:'Connexion administrateur requise.'});
  const csrf=crypto.createHmac('sha256',c.secret).update(auth.nonce).digest('base64url');
  try{
    if(req.method==='GET'){
      const params=new URL(req.url,'https://localhost').searchParams,{db}=await store.load();
      if(params.get('export')==='html'&&!params.has('id')){
        const filtered=new URLSearchParams(params);filtered.set('page','1');let result=queryRecords(db,filtered);const ids=result.rows.map(p=>p.id);
        for(let page=2;page<=result.pages;page++){filtered.set('page',String(page));ids.push(...queryRecords(db,filtered).rows.map(p=>p.id));}
        const projects=ids.map(id=>({...db.records[id],...analyze(db.records[id].fields,db.records[id].type)}));
        const labels={q:'Recherche',dept:'Département',commune:'Commune',from:'Depuis',to:'Jusqu’au',type:'Autorisation',group:'Type de projet',nature:'Nature',potential:'Potentiel (0 faible à 3 très élevé)',homesMin:'Logements min.',homesMax:'Logements max.',areaMin:'Surface min.',areaMax:'Surface max.',seen:'Consultation',status:'Suivi',contact:'Contact',includeInactive:'Inclure les dossiers inactifs'};
        const selection=[...params].filter(([k,v])=>v&&labels[k]).map(([k,v])=>labels[k]+' : '+v).join(' · ');
        res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="TravauxCorse-dossier-commercial-A4.html"');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");return res.end(exportSheet.batch(projects,db.followups,selection));
      }
      if(params.has('id')){
        const id=params.get('id');if(!ID.test(id)||!db.records[id])throw fail(404,'Permis introuvable.');
        const stored=db.records[id],p={...stored,...analyze(stored.fields,stored.type)},f=db.followups[id]||{status:STATUSES[0]};
        if(params.get('export')==='html'){
          res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="TravauxCorse-${p.number.replace(/[^a-zA-Z0-9-]/g,'')}.html"`);
          res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
          return res.end(exportSheet(p,f));
        }
        return send(res,200,{permit:{...p,company:company(p.fields),contactability:contactability(p,f)},followup:f,labels:db.labels,csrf});
      }
      return send(res,200,{...queryRecords(db,params),sync:db.sync,statuses:STATUSES,potentials:POTENTIAL,csrf});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
    if(!allowedAdminOrigin(req)||req.headers['x-csrf-token']!==csrf||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw fail(403,'Session ou origine invalide.');
    const b=await body(req);
    if(b.action==='sync')return send(res,200,await synchronize());
    if(!ID.test(b.id||''))throw fail(400,'Identifiant invalide.');
    const {db}=await store.load(),stored=db.records[b.id];if(!stored)throw fail(404,'Permis introuvable.');const p={...stored,...analyze(stored.fields,stored.type)};
    if(b.action==='project'){
      if(![2,5].includes(p.state))throw fail(400,'Dossier annulé ou terminé.');
      const projectId=await createProject(p);
      await store.mutate(d=>{d.followups[b.id]={...d.followups[b.id],projectId,firstAnalysis:d.followups[b.id]?.firstAnalysis||new Date().toISOString()};});
      return send(res,200,{projectId,url:'/admin/demandes/'});
    }
    if(!['seen','save'].includes(b.action))throw fail(400,'Action inconnue.');
    const followup=await store.mutate(d=>{
      const old=d.followups[b.id]||{status:STATUSES[0]};
      if(b.action==='seen'){d.followups[b.id]={...old,seenAt:old.seenAt||new Date().toISOString()};return d.followups[b.id];}
      if((old.version||0)!==(b.version||0))throw fail(409,'Ce suivi a été modifié ailleurs. Rechargez la fiche avant d’enregistrer.');
      if(!STATUSES.includes(b.status))throw fail(400,'Statut invalide.');
      if(b.nextDate&&!/^\d{4}-\d{2}-\d{2}$/.test(b.nextDate))throw fail(400,'Date invalide.');
      const contact=Object.hasOwn(b,'contactName')?validateContact(b):{};
      d.followups[b.id]={...old,...contact,status:b.status,assignee:clean(b.assignee,120),nextAction:clean(b.nextAction,1000),nextDate:clean(b.nextDate,10),notes:clean(b.notes,8000),townHallNotes:clean(b.townHallNotes,2000),firstAnalysis:old.firstAnalysis||new Date().toISOString(),updatedAt:new Date().toISOString(),version:(old.version||0)+1};return d.followups[b.id];
    });return send(res,200,{followup});
  }catch(e){console.error('Permits API:',e.name,e.status||'unavailable');return send(res,e.status||(e instanceof SyntaxError?400:503),{error:e.status?e.message:'La veille est temporairement indisponible. Les données enregistrées sont conservées.'});}
};
