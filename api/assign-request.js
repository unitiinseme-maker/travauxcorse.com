const crypto=require('node:crypto');
const {get,put}=require('@vercel/blob');
const {cmsSession,cmsConfig}=require('./editorial');
const {normalizeRequest}=require('../lib/project-request');
const {readArtisan,saveArtisan,newInvite,sendEmail}=require('../lib/artisan-accounts');
const send=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const match=(a,b)=>{const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y);};
module.exports=async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Méthode non autorisée.'});}
  const config=cmsConfig(),session=config.secret&&config.password?cmsSession(req,config):null;
  if(!session)return send(res,401,{error:'Reconnectez-vous pour affecter ce dossier.'});
  const origin=process.env.CMS_ALLOWED_ORIGIN||'https://travauxcorse-com.vercel.app';
  const csrf=crypto.createHmac('sha256',config.secret).update(session.nonce).digest('base64url');
  if(req.headers.origin!==origin||!match(req.headers['x-csrf-token']||'',csrf)||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,403,{error:'Session invalide. Rechargez la page.'});
  try{
    let body=req.body;
    if(body===undefined){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>5000)return send(res,413,{error:'Envoi trop volumineux.'});}body=JSON.parse(raw);}
    else if(typeof body==='string')body=JSON.parse(body);
    if(!body||Buffer.byteLength(JSON.stringify(body))>5000)return send(res,413,{error:'Envoi trop volumineux.'});
    const path=body.id;
    if(typeof path!=='string'||!/^requests\/[a-zA-Z0-9/_-]+\.json$/.test(path)||path.includes('//')||path.length>220)return send(res,400,{error:'Dossier invalide.'});
    const blob=await get(path,{access:'private',useCache:false});
    if(!blob||blob.statusCode!==200)return send(res,404,{error:'Dossier introuvable.'});
    const raw=await new Response(blob.stream).text();
    if(raw.length>30000)return send(res,413,{error:'Dossier trop volumineux.'});
    const item=normalizeRequest(JSON.parse(raw));
    if(!item)return send(res,400,{error:'Dossier illisible.'});
    let profile=null,assignment=null;
    if(body.action==='assign'){
      if(body.artisanId){profile=await readArtisan(body.artisanId);if(!profile||!profile.active)return send(res,404,{error:'Artisan enregistré introuvable.'});}
      const name=profile?.name|| (typeof body.name==='string'?body.name.trim().slice(0,120):'');
      const email=profile?.email|| (typeof body.email==='string'?body.email.trim().toLowerCase().slice(0,254):'');
      if(!name||!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'Indiquez le nom et une adresse e-mail valide pour l’artisan.'});
      if(item.assignedArtisans.some(a=>a.email.toLowerCase()===email))return send(res,409,{error:'Cet artisan est déjà affecté à ce dossier.'});
      if(item.assignedArtisans.length>=10)return send(res,400,{error:'Ce dossier comporte déjà dix artisans.'});
      assignment={id:crypto.randomUUID(),name,email,at:new Date().toISOString(),artisanId:profile?.id||'',notified:false,status:'Affectée',response:''};
      item.assignedArtisans.push(assignment);
      item.status='Entreprises affectées';item.history.push({at:assignment.at,text:'Entreprise affectée par TravauxCorse : '+name});
    }else if(body.action==='notify'){
      assignment=item.assignedArtisans.find(a=>a.id===body.assignmentId);
      if(!assignment)return send(res,404,{error:'Affectation introuvable.'});
      if(assignment.notified)return send(res,409,{error:'La notification a déjà été envoyée.'});
      if(!assignment.artisanId)return send(res,400,{error:'Enregistrez cet artisan dans le répertoire avant de lui envoyer une invitation.'});
      profile=await readArtisan(assignment.artisanId);
      if(!profile?.active||profile.email!==assignment.email)return send(res,404,{error:'Le profil de cet artisan est introuvable.'});
    }else if(body.action==='remove'){
      const before=item.assignedArtisans.length;
      item.assignedArtisans=item.assignedArtisans.filter(a=>a.id!==body.assignmentId);
      if(before===item.assignedArtisans.length)return send(res,404,{error:'Affectation introuvable.'});
      item.history.push({at:new Date().toISOString(),text:'Une affectation a été retirée par TravauxCorse'});
    }else if(body.action==='status'){
      const allowed=['Demande reçue','Analyse par TravauxCorse','Entreprises recherchées','Entreprises affectées','Réponses en attente','Devis reçus','Projet en cours','Travaux terminés'];
      if(!allowed.includes(body.status))return send(res,400,{error:'Statut invalide.'});
      item.status=body.status;item.history.push({at:new Date().toISOString(),text:'Statut modifié : '+body.status});
    }else if(body.action==='message'){
      const message=typeof body.message==='string'?body.message.trim().slice(0,3000):'';
      if(!message)return send(res,400,{error:'Écrivez le message.'});
      item.messages.push({at:new Date().toISOString(),from:'TravauxCorse',text:message});
      item.history.push({at:new Date().toISOString(),text:'Message envoyé au client par TravauxCorse'});
    }else return send(res,400,{error:'Action non reconnue.'});
    if(body.action!=='notify')await put(path,JSON.stringify(item),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
    let notificationSent=false,inviteUrl,notificationError;
    if(profile){
      try{
        const invite=newInvite(profile);await saveArtisan(profile);
        const email=await sendEmail(profile.email,'Un nouveau projet vous est affecté | TravauxCorse',
          'Bonjour '+profile.name+',\n\nUn nouveau projet vous est affecté sur TravauxCorse.\nProjet : '+item.title+'\nCommune : '+item.commune+'\nMétiers : '+item.trades+'\n\nConsultez votre espace privé : '+invite.url+'\n\nCe lien est valable 7 jours.\n\nTravauxCorse');
        notificationSent=email.sent;
        if(notificationSent){assignment.notified=true;await put(path,JSON.stringify(item),{access:'private',allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});}
        else{inviteUrl=invite.url;notificationError=email.reason;}
      }catch(error){console.error('Artisan notification failed',error?.message);notificationError='La notification n’a pas pu être envoyée.';}
    }
    return send(res,200,{ok:true,assignedArtisans:item.assignedArtisans,notificationSent,notificationError,inviteUrl,artisanId:profile?.id});
  }catch(error){console.error('Request assignment failed',error?.message);return send(res,error instanceof SyntaxError?400:503,{error:'L’affectation n’a pas pu être enregistrée. Réessayez.'});}
};
