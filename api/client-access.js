const crypto=require('node:crypto');
const {put,get}=require('@vercel/blob');
const {allRequests,readRequest,saveRequest}=require('../lib/request-store');
const {hash,readProfile,saveProfile,newInvite,cookie,session}=require('../lib/client-accounts');
const {sendEmail}=require('../lib/artisan-accounts');
const reply=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const attempts=new Map();
const origin=()=>process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
function limited(req){
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  for(const [key,val] of attempts)if(val.until<Date.now())attempts.delete(key);
  const record=attempts.get(ip)||{count:0,until:Date.now()+900000};
  record.count++;attempts.set(ip,record);
  return record.count>8;
}
function clientView(item){
  const {id,date,title,commune,trades,description,delay,budget,property,surface,status,assignedArtisans,history,messages,documents,quotes}=item;
  return {id,date,title,commune,trades,description,delay,budget,property,surface,status,
    assignedArtisans:assignedArtisans.map(({id,name,at,status,response,respondedAt})=>({id,name,at,status,response,respondedAt})),
    history,messages:messages.filter(m=>m.from==='client'||m.from==='TravauxCorse'),documents,quotes};
}
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const secret=process.env.CMS_SECRET;
  if(!secret)return reply(res,503,{error:'Accès client indisponible.'});
  try{
    if(req.method==='GET'){
      const data=session(req,secret);
      if(!data)return reply(res,401,{error:'Connectez-vous avec le lien reçu par e-mail.'});
      const profile=await readProfile(data.email);
      if(!profile||profile.version!==data.version)return reply(res,401,{error:'Votre session a expiré.'});
      if(req.query?.file){
        const item=await readRequest(req.query.project);
        if(!item||item.email.toLowerCase()!==data.email.toLowerCase())return reply(res,404,{error:'Document introuvable.'});
        const doc=item.documents.find(d=>d.path===req.query.file);
        if(!doc)return reply(res,404,{error:'Document introuvable.'});
        const blob=await get(doc.path,{access:'private',useCache:false});
        if(!blob||blob.statusCode!==200)return reply(res,404,{error:'Document introuvable.'});
        res.setHeader('Content-Type',doc.type);
        res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(doc.name));
        res.end(Buffer.from(await new Response(blob.stream).arrayBuffer()));return;
      }
      const projects=(await allRequests()).filter(x=>x.email.toLowerCase()===data.email.toLowerCase()).map(clientView);
      return reply(res,200,{profile:{name:profile.name||'',phone:profile.phone||'',email:profile.email,commune:profile.commune||'',address:profile.address||'',postcode:profile.postcode||''},projects});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(res,405,{error:'Méthode non autorisée.'});}
    if(req.headers.origin!==origin()||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(res,403,{error:'Origine non autorisée.'});
    let body=req.body;
    if(body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>3000000)return reply(res,413,{error:'Fichier trop volumineux (2 Mo maximum).'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||Buffer.byteLength(JSON.stringify(body))>3000000)return reply(res,413,{error:'Envoi trop volumineux.'});
    if(body.action==='request-link'){
      if(limited(req))return reply(res,429,{error:'Trop de tentatives. Réessayez dans 15 minutes.'});
      const email=typeof body.email==='string'?body.email.trim().toLowerCase().slice(0,254):'';
      if(!/^\S+@\S+\.\S+$/.test(email))return reply(res,400,{error:'Adresse e-mail invalide.'});
      const projects=(await allRequests()).filter(x=>x.email.toLowerCase()===email);
      if(projects.length){
        const profile=await readProfile(email)||{email,name:projects[0].name,phone:projects[0].phone,commune:projects[0].commune,version:1};
        const url=newInvite(profile);
        await saveProfile(profile);
        const sent=await sendEmail(email,'Votre accès privé TravauxCorse','Bonjour '+profile.name+',\n\nAccédez à vos demandes : '+url+'\n\nCe lien est valable 30 minutes.\n\nTravauxCorse');
        if(!sent.sent)console.error('Client access email not sent',sent.reason);
      }
      return reply(res,200,{ok:true,message:'Si cette adresse correspond à une demande et que l’envoi fonctionne, un lien vous a été envoyé.'});
    }
    if(body.action==='redeem'){
      if(limited(req))return reply(res,429,{error:'Trop de tentatives.'});
      const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
      if(!/^\S+@\S+\.\S+$/.test(email)||typeof body.token!=='string'||!/^[-_A-Za-z0-9]{40,100}$/.test(body.token))return reply(res,400,{error:'Lien invalide.'});
      const profile=await readProfile(email);
      if(!profile?.invite||profile.invite.exp<Date.now()||profile.invite.hash!==hash(body.token))return reply(res,401,{error:'Lien expiré. Demandez un nouvel accès.'});
      delete profile.invite;await saveProfile(profile);
      res.setHeader('Set-Cookie',cookie(profile,secret));return reply(res,200,{ok:true});
    }
    if(body.action==='logout'){
      res.setHeader('Set-Cookie','__Host-tc-client=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0');return reply(res,200,{ok:true});
    }
    const data=session(req,secret),profile=data&&await readProfile(data.email);
    if(!profile||profile.version!==data.version)return reply(res,401,{error:'Reconnectez-vous.'});
    if(body.action==='profile'){
      for(const key of ['name','phone','commune','address','postcode'])if(typeof body[key]==='string')profile[key]=body[key].trim().slice(0,key==='address'?200:120);
      await saveProfile(profile);return reply(res,200,{ok:true});
    }
    if(body.action==='close-session'){
      profile.version=(profile.version||1)+1;await saveProfile(profile);
      res.setHeader('Set-Cookie','__Host-tc-client=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0');
      return reply(res,200,{ok:true});
    }
    const item=await readRequest(body.project);
    if(!item||item.email.toLowerCase()!==data.email.toLowerCase())return reply(res,404,{error:'Projet introuvable.'});
    const at=new Date().toISOString();
    if(body.action==='edit'){
      if(item.status!=='Demande reçue')return reply(res,409,{error:'Contactez TravauxCorse pour modifier ce projet en cours de traitement.'});
      for(const key of ['description','delay','budget'])if(typeof body[key]==='string')item[key]=body[key].trim().slice(0,key==='description'?10000:80);
      item.history.push({at,text:'Projet complété par le client'});
    }else if(body.action==='message'){
      const text=typeof body.text==='string'?body.text.trim().slice(0,3000):'';
      if(!text)return reply(res,400,{error:'Écrivez votre message.'});
      item.messages.push({at,from:'client',text});
      item.history.push({at,text:'Message transmis à TravauxCorse'});
    }else if(body.action==='quote'){
      const quote=item.quotes.find(x=>x.id===body.quoteId&&item.assignedArtisans.some(a=>a.id===x.assignmentId));
      if(!quote||quote.status!=='Envoyé')return reply(res,404,{error:'Devis indisponible.'});
      if(!['Accepté','Refusé'].includes(body.status))return reply(res,400,{error:'Statut invalide.'});
      quote.status=body.status;item.history.push({at,text:'Devis '+body.status.toLowerCase()+' par le client'});
    }else if(body.action==='upload'){
      if(item.documents.length>=30)return reply(res,400,{error:'Limite de documents atteinte.'});
      const type=String(body.type||''),ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[type];
      const value=String(body.data||'');
      if(!ext||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))return reply(res,400,{error:'Format autorisé : JPEG, PNG, WebP ou PDF.'});
      const bytes=Buffer.from(value,'base64');
      if(!bytes.length||bytes.length>2*1024*1024)return reply(res,413,{error:'Fichier limité à 2 Mo.'});
      if(ext==='pdf'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||ext==='png'&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||ext==='jpg'&&!(bytes[0]===255&&bytes[1]===216)||ext==='webp'&&bytes.toString('ascii',0,4)!=='RIFF')return reply(res,400,{error:'Contenu du fichier invalide.'});
      const path='project-files/'+crypto.randomUUID()+'.'+ext;
      await put(path,bytes,{access:'private',contentType:type,addRandomSuffix:false});
      item.documents.push({path,name:String(body.name||'Document').replace(/[\/\\\x00-\x1f]/g,'').slice(0,160),type,at,owner:'client'});
      item.history.push({at,text:'Document ajouté par le client'});
    }else return reply(res,400,{error:'Action inconnue.'});
    await saveRequest(item);
    return reply(res,200,{ok:true,project:clientView(item)});
  }catch(error){
    console.error('Client portal error',error?.message);
    return reply(res,error instanceof SyntaxError?400:503,{error:'Le service est momentanément indisponible. Réessayez.'});
  }
};
