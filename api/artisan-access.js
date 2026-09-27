const {list,get}=require('@vercel/blob');
const {normalizeRequest}=require('../lib/project-request');
const {hash,readArtisan,listArtisans,saveArtisan,newInvite,sessionCookie,parseSession,emailConfigured,sendEmail}=require('../lib/artisan-accounts');
const attempts=new Map();
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
async function projectsFor(profile){
  const paths=[];let cursor;
  do{const page=await list({prefix:'requests/',limit:1000,cursor});paths.push(...page.blobs.map(x=>x.pathname).filter(x=>x.endsWith('.json')));cursor=page.hasMore?page.cursor:undefined;}while(cursor&&paths.length<5000);
  const projects=[];
  for(let i=0;i<paths.length;i+=8){
    const batch=await Promise.all(paths.slice(i,i+8).map(async path=>{
      const blob=await get(path,{access:'private',useCache:false});if(!blob||blob.statusCode!==200)return null;
      const raw=await new Response(blob.stream).text();if(raw.length>30000)return null;
      const item=normalizeRequest(JSON.parse(raw));
      return item?.assignedArtisans.some(a=>a.email===profile.email&&(!a.artisanId||a.artisanId===profile.id))?{
        date:item.date,title:item.title,commune:item.commune,trades:item.trades,description:item.description,delay:item.delay,budget:item.budget,property:item.property,surface:item.surface,
        client:{name:item.name,email:item.email,phone:item.phone}
      }:null;
    }));projects.push(...batch.filter(Boolean));
  }
  return projects.sort((a,b)=>b.date.localeCompare(a.date));
}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const secret=process.env.CMS_SECRET;
  if(!secret)return send(res,503,{error:'Accès momentanément indisponible.'});
  if(req.method==='GET'){
    try{
      const session=parseSession(req,secret);if(!session)return send(res,401,{error:'Ouvrez votre lien personnel ou demandez un nouvel accès.'});
      const profile=await readArtisan(session.id);if(!profile?.active||profile.email!==session.email)return send(res,401,{error:'Accès expiré.'});
      return send(res,200,{artisan:{name:profile.name,email:profile.email,trades:profile.trades},projects:await projectsFor(profile)});
    }catch(error){console.error('Artisan portal read failed',error?.message);return send(res,503,{error:'Vos projets sont momentanément indisponibles.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Méthode non autorisée.'});}
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  if(req.headers.origin!==origin||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Origine non autorisée.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2000)return send(res,413,{error:'Données trop volumineuses.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||Buffer.byteLength(JSON.stringify(body))>2000)return send(res,413,{error:'Données trop volumineuses.'});
    if(body.action==='logout'){
      res.setHeader('Set-Cookie','__Host-tc-artisan=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0');return send(res,200,{ok:true});
    }
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
    for(const [key,value] of attempts)if(value.until<Date.now())attempts.delete(key);
    const attempt=attempts.get(ip)||{count:0,until:Date.now()+900000};
    if(attempt.count>=8)return send(res,429,{error:'Trop de tentatives. Réessayez dans 15 minutes.'});
    attempt.count++;attempts.set(ip,attempt);
    if(body.action==='redeem'){
      if(typeof body.token!=='string'||!/^[-_A-Za-z0-9]{40,100}$/.test(body.token))return send(res,400,{error:'Lien invalide.'});
      const target=hash(body.token),profile=(await listArtisans()).find(p=>p.active&&(p.invites||[]).some(x=>x.hash===target&&x.exp>Date.now()));
      if(!profile)return send(res,401,{error:'Ce lien a expiré. Demandez un nouvel accès à TravauxCorse.'});
      profile.invites=profile.invites.filter(x=>x.hash!==target&&x.exp>Date.now());await saveArtisan(profile);
      attempts.delete(ip);res.setHeader('Set-Cookie',sessionCookie(profile,secret));return send(res,200,{ok:true});
    }
    if(body.action==='request-link'){
      const email=typeof body.email==='string'?body.email.trim().toLowerCase().slice(0,254):'';
      if(!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'Adresse e-mail invalide.'});
      if(emailConfigured()){
        const profile=(await listArtisans()).find(p=>p.active&&p.email===email);
        if(profile){const invite=newInvite(profile);await saveArtisan(profile);try{await sendEmail(email,'Votre accès TravauxCorse','Bonjour '+profile.name+',\n\nAccédez à vos projets : '+invite.url+'\n\nCe lien est valable 7 jours.\n\nTravauxCorse');}catch(error){console.error('Artisan access email failed',error?.message);}}
      }
      return send(res,200,{ok:true});
    }
    return send(res,400,{error:'Action inconnue.'});
  }catch(error){console.error('Artisan access failed',error?.message);return send(res,error instanceof SyntaxError?400:503,{error:'Accès momentanément indisponible.'});}
};
